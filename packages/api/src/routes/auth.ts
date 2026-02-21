import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { env } from '../config/env';
import { isMailerConfigured, sendOtpEmail } from '../services/mailer';

const router = Router();
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const STUDENT_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'students');
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
let ensureStudentTablesPromise: Promise<void> | null = null;

function safeBaseName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function parseBase64Payload(raw: string) {
  const value = String(raw || '');
  const match = value.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: null, base64: value };
}

async function saveStudentFile(input: {
  userId: number;
  fileName: string;
  rawBase64: string;
  mimeType?: string | null;
}) {
  const parsed = parseBase64Payload(input.rawBase64);
  const normalizedMime = (input.mimeType || parsed.mimeType || '').toLowerCase();
  const bytes = Buffer.from(parsed.base64, 'base64');
  if (!bytes.length || Number.isNaN(bytes.length)) {
    throw new Error('Invalid file payload');
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error('File too large. Max 8MB allowed');
  }

  await fs.mkdir(STUDENT_UPLOAD_DIR, { recursive: true });
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const base = safeBaseName(input.fileName || 'file');
  const extension = path.extname(base) || (normalizedMime.includes('pdf') ? '.pdf' : '');
  const nameWithoutExt = base.replace(new RegExp(`${extension.replace('.', '\\.')}$`), '') || 'file';
  const storedFileName = `${input.userId}_${timestamp}_${random}_${nameWithoutExt}${extension}`;
  const absolutePath = path.join(STUDENT_UPLOAD_DIR, storedFileName);
  await fs.writeFile(absolutePath, bytes);
  return {
    fileUrl: `/uploads/students/${storedFileName}`,
    mimeType: normalizedMime || null
  };
}

async function ensureStudentTables() {
  if (!ensureStudentTablesPromise) {
    ensureStudentTablesPromise = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS student_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          dob DATE NULL,
          gender VARCHAR(20) NULL,
          highest_qualification VARCHAR(120) NULL,
          preferred_intake VARCHAR(120) NULL,
          bio TEXT NULL,
          profile_picture_url VARCHAR(512) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_student_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
      );

      await pool.query(
        `CREATE TABLE IF NOT EXISTS student_documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          document_name VARCHAR(255) NOT NULL,
          original_file_name VARCHAR(255) NULL,
          file_url VARCHAR(512) NOT NULL,
          mime_type VARCHAR(120) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_student_document_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_student_documents_user_created (user_id, created_at)
        )`
      );
    })().catch((err) => {
      ensureStudentTablesPromise = null;
      throw err;
    });
  }
  await ensureStudentTablesPromise;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

type PanelRole = 'admin' | 'manager' | 'employee';
const PANEL_ROLE_PRIORITY: PanelRole[] = ['admin', 'manager', 'employee'];

function parseCsv(value: unknown): string[] {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPanelRoles(input: unknown): PanelRole[] {
  const valid = new Set<PanelRole>(['admin', 'manager', 'employee']);
  const values = Array.isArray(input) ? input : [input];
  const roles = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .flatMap((value) =>
      String(value || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
    )
    .filter((value): value is PanelRole => valid.has(value as PanelRole));
  return [...new Set(roles)];
}

function getPrimaryPanelRole(roles: PanelRole[]): PanelRole | null {
  for (const role of PANEL_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return null;
}

async function findUser(email?: string, phone?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1',
    [email || null, phone || null]
  );
  return rows[0] as RowDataPacket | undefined;
}

router.post('/request-otp', async (req, res) => {
  const { name, email, phone, city } = req.body || {};
  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone is required' });
  }

  const emailNorm = email ? String(email).trim().toLowerCase() : null;
  const phoneNorm = phone ? String(phone).replace(/\s+/g, '') : null;
  const code = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const existing = await findUser(emailNorm || undefined, phoneNorm || undefined);

  if (phoneNorm) {
    const [phoneRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phoneNorm]);
    if (phoneRows.length && (!existing || Number(phoneRows[0].id) !== Number(existing.id))) {
      return res.status(409).json({ error: 'User with this phone already exists' });
    }
  }
  if (emailNorm) {
    const [emailRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);
    if (emailRows.length && (!existing || Number(emailRows[0].id) !== Number(existing.id))) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
  }

  if (existing) {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           city = COALESCE(?, city),
           otp_code = ?,
           otp_expires_at = ?
       WHERE id = ?`,
      [name || null, phoneNorm, city || null, code, expires, existing.id]
    );
  } else {
    await pool.query<ResultSetHeader>(
      `INSERT INTO users (name, email, phone, city, otp_code, otp_expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name || emailNorm || phoneNorm, emailNorm, phoneNorm, city || null, code, expires]
    );
  }

  let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
  if (emailNorm && isMailerConfigured()) {
    try {
      await sendOtpEmail(emailNorm, code);
      emailStatus = 'sent';
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      emailStatus = 'failed';
    }
  }

  const response: Record<string, unknown> = {
    message: 'OTP sent',
    expiresInSeconds: 600,
    emailStatus
  };

  if (env.nodeEnv !== 'production') {
    response.otp = code;
  }

  res.json(response);
});

router.post('/verify-otp', async (req, res) => {
  const { email, phone, code } = req.body || {};
  if (!code || (!email && !phone)) {
    return res.status(400).json({ error: 'Code and email or phone are required' });
  }

  const emailNorm = email ? String(email).trim().toLowerCase() : null;
  const phoneNorm = phone ? String(phone).replace(/\s+/g, '') : null;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM users WHERE (email = ? OR phone = ?) AND otp_code = ? LIMIT 1`,
    [emailNorm || null, phoneNorm || null, code]
  );

  if (!rows.length) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  const user = rows[0];
  if (!user.otp_expires_at || new Date(user.otp_expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Code expired' });
  }

  await pool.query<ResultSetHeader>(
    `UPDATE users
     SET otp_code = NULL,
         otp_expires_at = NULL,
         email_verified_at = IFNULL(email_verified_at, NOW()),
         last_login_at = NOW()
     WHERE id = ?`,
    [user.id]
  );

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    role: user.role || 'student'
  });
});

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.password_hash,
            GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
     WHERE u.email = ?
     GROUP BY u.id
     LIMIT 1`,
    [emailNorm]
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = rows[0];
  const mappedRoles = parseCsv(user.rolesCsv).filter((role): role is PanelRole =>
    ['admin', 'manager', 'employee'].includes(role)
  );
  const fallbackRole = ['admin', 'manager', 'employee'].includes(String(user.role || '').toLowerCase())
    ? ([String(user.role).toLowerCase()] as PanelRole[])
    : [];
  const panelRoles = [...new Set([...mappedRoles, ...fallbackRole])];
  const primaryRole = getPrimaryPanelRole(panelRoles);

  if (!primaryRole) {
    return res.status(403).json({ error: 'Admin panel access requires admin/manager/employee role' });
  }

  const hash = user.password_hash ? String(user.password_hash) : '';
  if (!hash) {
    return res.status(401).json({ error: 'Password not set for this admin account' });
  }

  const isValid = await bcrypt.compare(String(password), hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await pool.query<ResultSetHeader>(
    `UPDATE users
     SET last_login_at = NOW()
     WHERE id = ?`,
    [user.id]
  );

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    role: primaryRole,
    roles: panelRoles
  });
});

router.get('/leads-summary', async (_req, res) => {
  const [dailyRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count
     FROM users
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`
  );

  const [recentRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, email, phone, city, role, created_at AS createdAt
     FROM users
     ORDER BY created_at DESC
     LIMIT 20`
  );

  const [totalRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
  const [recentLoginRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE last_login_at IS NOT NULL
       AND last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
  const [locationRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        TRIM(COALESCE(NULLIF(city, ''), 'Unknown')) AS location,
        COUNT(*) AS count
     FROM users
     GROUP BY TRIM(COALESCE(NULLIF(city, ''), 'Unknown'))
     ORDER BY count DESC, location ASC
     LIMIT 12`
  );
  const [todayReminderRows] = await pool.query<RowDataPacket[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            lc.conversation_status AS conversationStatus,
            lc.looking_for AS lookingFor,
            lc.notes,
            lc.reminder_at AS reminderAt
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     WHERE lc.reminder_at IS NOT NULL
       AND DATE(lc.reminder_at) = CURDATE()
       AND lc.reminder_done = 0
     ORDER BY lc.reminder_at ASC
     LIMIT 50`
  );

  const countsByDay = new Map<string, number>();
  dailyRows.forEach((row) => {
    const key = new Date(row.day).toISOString().slice(0, 10);
    countsByDay.set(key, Number(row.count) || 0);
  });

  const dailyRegistrations = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return { day: key, count: countsByDay.get(key) || 0 };
  });

  res.json({
    totalLeads: Number(totalRows[0]?.total || 0),
    recentLoginCount: Number(recentLoginRows[0]?.total || 0),
    dailyRegistrations,
    recentUsers: recentRows,
    todaysRemindersCount: todayReminderRows.length,
    todaysReminders: todayReminderRows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      userName: String(row.userName || ''),
      userEmail: row.userEmail ? String(row.userEmail) : null,
      userPhone: row.userPhone ? String(row.userPhone) : null,
      conversationStatus: String(row.conversationStatus || 'new'),
      lookingFor: row.lookingFor ? String(row.lookingFor) : null,
      notes: row.notes ? String(row.notes) : null,
      reminderAt: row.reminderAt
    })),
    usersByLocation: locationRows.map((row) => ({
      location: String(row.location),
      count: Number(row.count) || 0
    }))
  });
});

router.get('/users', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
            GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv,
            GROUP_CONCAT(DISTINCT uca.country_id ORDER BY uca.country_id SEPARATOR ',') AS countryIdsCsv
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
     LEFT JOIN user_country_access uca ON uca.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT 500`
  );
  res.json(
    rows.map((row) => ({
      ...row,
      roles: parseCsv(row.rolesCsv),
      countryIds: parseCsv(row.countryIdsCsv).map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    }))
  );
});

router.post('/users', async (req, res) => {
  const { name, email, phone, city, role, roles, countryIds, password } = req.body || {};

  const nameValue = String(name || '').trim();
  const emailValue = String(email || '').trim().toLowerCase();
  const phoneValue = phone ? String(phone).trim() : null;
  const cityValue = city ? String(city).trim() : null;

  if (!nameValue || !emailValue) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const selectedRoles = toPanelRoles(roles);
  const fallbackRole = toPanelRoles(role);
  const mergedRoles = [...new Set([...selectedRoles, ...fallbackRole])];
  const roleValue = getPrimaryPanelRole(mergedRoles) || 'student';
  const passwordValue = password ? String(password) : '';

  const needsPassword = mergedRoles.length > 0;
  if (needsPassword && passwordValue.length < 6) {
    return res.status(400).json({ error: 'Password with at least 6 characters is required for admin/manager/employee roles' });
  }

  const passwordHash = passwordValue ? await bcrypt.hash(passwordValue, 10) : null;

  const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [emailValue]);
  if (existing.length) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }
  if (phoneValue) {
    const [phoneExisting] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phoneValue]);
    if (phoneExisting.length) {
      return res.status(409).json({ error: 'User with this phone already exists' });
    }
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (name, email, phone, city, role, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nameValue, emailValue, phoneValue, cityValue, roleValue, passwordHash]
  );

  const id = (result as ResultSetHeader).insertId;

  if (mergedRoles.length) {
    await pool.query<ResultSetHeader>('DELETE FROM user_admin_roles WHERE user_id = ?', [id]);
    await Promise.all(
      mergedRoles.map((panelRole) =>
        pool.query<ResultSetHeader>('INSERT INTO user_admin_roles (user_id, role) VALUES (?, ?)', [id, panelRole])
      )
    );
  }

  const normalizedCountryIds = Array.isArray(countryIds)
    ? countryIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
    : [];

  if (normalizedCountryIds.length) {
    await Promise.all(
      normalizedCountryIds.map((countryId) =>
        pool.query<ResultSetHeader>('INSERT IGNORE INTO user_country_access (user_id, country_id) VALUES (?, ?)', [
          id,
          countryId
        ])
      )
    );
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
            GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv,
            GROUP_CONCAT(DISTINCT uca.country_id ORDER BY uca.country_id SEPARATOR ',') AS countryIdsCsv
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
     LEFT JOIN user_country_access uca ON uca.user_id = u.id
     WHERE u.id = ?
     GROUP BY u.id
     LIMIT 1`,
    [id]
  );

  const row = rows[0];
  res.status(201).json({
    ...row,
    roles: parseCsv(row.rolesCsv),
    countryIds: parseCsv(row.countryIdsCsv).map((item) => Number(item)).filter((item) => !Number.isNaN(item))
  });
});

router.post('/users/bulk', async (req, res) => {
  const inputUsers = Array.isArray(req.body?.users) ? req.body.users : [];
  if (!inputUsers.length) {
    return res.status(400).json({ error: 'users array is required' });
  }
  if (inputUsers.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 users per upload' });
  }

  const created: RowDataPacket[] = [];
  const failed: Array<{ row: number; email?: string; reason: string }> = [];

  for (let index = 0; index < inputUsers.length; index += 1) {
    const source = inputUsers[index] || {};
    const rowNumber = index + 2; // assumes row 1 is header in CSV

    const nameValue = String(source.name || '').trim();
    const emailValue = String(source.email || '').trim().toLowerCase();
    const phoneValue = source.phone ? String(source.phone).trim() : null;
    const cityValue = 'Hyderabad';

    if (!nameValue || !emailValue) {
      failed.push({ row: rowNumber, email: emailValue || undefined, reason: 'name and email are required' });
      continue;
    }

    const roleValue = 'uploaded';
    const passwordValue = 'Student@123';

    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [emailValue]);
    if (existing.length) {
      failed.push({ row: rowNumber, email: emailValue, reason: 'user already exists' });
      continue;
    }
    if (phoneValue) {
      const [phoneExisting] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phoneValue]);
      if (phoneExisting.length) {
        failed.push({ row: rowNumber, email: emailValue, reason: 'phone already exists' });
        continue;
      }
    }

    const passwordHash = passwordValue ? await bcrypt.hash(passwordValue, 10) : null;

    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO users (name, email, phone, city, role, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nameValue, emailValue, phoneValue, cityValue, roleValue, passwordHash]
      );

      const id = (result as ResultSetHeader).insertId;

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
                GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv,
                GROUP_CONCAT(DISTINCT uca.country_id ORDER BY uca.country_id SEPARATOR ',') AS countryIdsCsv
         FROM users u
         LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
         LEFT JOIN user_country_access uca ON uca.user_id = u.id
         WHERE u.id = ?
         GROUP BY u.id
         LIMIT 1`,
        [id]
      );

      if (rows.length) {
        created.push({
          ...rows[0],
          roles: parseCsv(rows[0].rolesCsv),
          countryIds: parseCsv(rows[0].countryIdsCsv).map((item) => Number(item)).filter((item) => !Number.isNaN(item))
        });
      }
    } catch (err) {
      failed.push({
        row: rowNumber,
        email: emailValue,
        reason: err instanceof Error ? err.message : 'failed to create user'
      });
    }
  }

  res.status(201).json({
    createdCount: created.length,
    failedCount: failed.length,
    created,
    failed
  });
});

router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid user id is required' });
  }

  const { name, email, phone, city, role, roles, countryIds, password } = req.body || {};
  const updates: string[] = [];
  const values: Array<string | null> = [];

  if (name !== undefined) {
    const nameValue = String(name || '').trim();
    if (!nameValue) return res.status(400).json({ error: 'name cannot be empty' });
    updates.push('name = ?');
    values.push(nameValue);
  }

  if (email !== undefined) {
    const emailValue = String(email || '').trim().toLowerCase();
    if (!emailValue) return res.status(400).json({ error: 'email cannot be empty' });

    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [emailValue, id]);
    if (existing.length) {
      return res.status(409).json({ error: 'Another user with this email already exists' });
    }

    updates.push('email = ?');
    values.push(emailValue);
  }

  if (phone !== undefined) {
    const phoneValue = phone ? String(phone).trim() : null;
    if (phoneValue) {
      const [phoneExisting] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1', [
        phoneValue,
        id
      ]);
      if (phoneExisting.length) {
        return res.status(409).json({ error: 'Another user with this phone already exists' });
      }
    }
    updates.push('phone = ?');
    values.push(phoneValue);
  }

  if (city !== undefined) {
    updates.push('city = ?');
    values.push(city ? String(city).trim() : null);
  }

  const selectedRoles = roles !== undefined ? toPanelRoles(roles) : [];
  const fallbackRole = role !== undefined ? toPanelRoles(role) : [];
  const mergedRoles = roles !== undefined || role !== undefined ? [...new Set([...selectedRoles, ...fallbackRole])] : null;

  if (mergedRoles) {
    const roleValue = getPrimaryPanelRole(mergedRoles) || 'student';
    updates.push('role = ?');
    values.push(roleValue);
  }

  if (password !== undefined) {
    const passwordValue = String(password || '');
    if (passwordValue) {
      const requiresPassword = mergedRoles ? mergedRoles.length > 0 : false;
      if (requiresPassword && passwordValue.length < 6) {
        return res.status(400).json({ error: 'Password with at least 6 characters is required for admin/manager/employee roles' });
      }
      const passwordHash = await bcrypt.hash(passwordValue, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }
  }

  if (updates.length) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    await pool.query<ResultSetHeader>(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, String(id)]);
  }

  if (mergedRoles) {
    await pool.query<ResultSetHeader>('DELETE FROM user_admin_roles WHERE user_id = ?', [id]);
    if (mergedRoles.length) {
      await Promise.all(
        mergedRoles.map((panelRole) =>
          pool.query<ResultSetHeader>('INSERT INTO user_admin_roles (user_id, role) VALUES (?, ?)', [id, panelRole])
        )
      );
    }
  }

  if (countryIds !== undefined) {
    const normalizedCountryIds = Array.isArray(countryIds)
      ? countryIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      : [];

    await pool.query<ResultSetHeader>('DELETE FROM user_country_access WHERE user_id = ?', [id]);
    if (normalizedCountryIds.length) {
      await Promise.all(
        normalizedCountryIds.map((countryId) =>
          pool.query<ResultSetHeader>('INSERT IGNORE INTO user_country_access (user_id, country_id) VALUES (?, ?)', [
            id,
            countryId
          ])
        )
      );
    }
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
            GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv,
            GROUP_CONCAT(DISTINCT uca.country_id ORDER BY uca.country_id SEPARATOR ',') AS countryIdsCsv
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
     LEFT JOIN user_country_access uca ON uca.user_id = u.id
     WHERE u.id = ?
     GROUP BY u.id
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const row = rows[0];
  res.json({
    ...row,
    roles: parseCsv(row.rolesCsv),
    countryIds: parseCsv(row.countryIdsCsv).map((item) => Number(item)).filter((item) => !Number.isNaN(item))
  });
});

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid user id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true });
});

router.get('/student-dashboard', async (req, res) => {
  await ensureStudentTables();
  const userId = Number(req.query.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role,
            sp.dob, sp.gender, sp.highest_qualification AS highestQualification,
            sp.preferred_intake AS preferredIntake, sp.bio, sp.profile_picture_url AS profilePictureUrl
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  if (!users.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const [documents] = await pool.query<RowDataPacket[]>(
    `SELECT id, document_name AS documentName, original_file_name AS originalFileName,
            file_url AS fileUrl, mime_type AS mimeType, created_at AS createdAt
     FROM student_documents
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  const [applications] = await pool.query<RowDataPacket[]>(
    `SELECT a.id, a.program_id AS programId, a.country_id AS countryId, a.status, a.created_at AS createdAt,
            p.program_name AS programName, p.university_name AS universityName,
            c.name AS countryName
     FROM applications a
     LEFT JOIN programs p ON p.id = a.program_id
     LEFT JOIN countries c ON c.id = a.country_id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 200`,
    [userId]
  );

  const [countryRows] = await pool.query<RowDataPacket[]>(
    `SELECT country_id AS countryId
     FROM applications
     WHERE user_id = ? AND country_id IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  const relatedCountryId = countryRows.length ? Number(countryRows[0].countryId) : null;

  const [relatedPrograms] = relatedCountryId
    ? await pool.query<RowDataPacket[]>(
        `SELECT p.id, p.program_name AS programName, p.university_name AS universityName,
                p.level_of_study AS levelOfStudy, p.location, p.language_of_study AS languageOfStudy,
                p.tuition_fee_per_year AS tuitionFeePerYear, p.application_fee AS applicationFee,
                c.id AS countryId, c.name AS countryName, c.iso_code AS countryIso
         FROM programs p
         INNER JOIN countries c ON c.id = p.country_id
         WHERE p.country_id = ?
         ORDER BY p.updated_at DESC, p.id DESC
         LIMIT 8`,
        [relatedCountryId]
      )
    : [[] as RowDataPacket[]];

  const [interestedRows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.city, u.created_at AS createdAt,
            lc.updated_at AS interestUpdatedAt
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     WHERE lc.conversation_status = 'interested'
       AND lc.updated_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       AND LOWER(COALESCE(u.role, 'student')) IN ('student', 'uploaded')
     ORDER BY lc.updated_at DESC
     LIMIT 30`
  );

  const user = users[0];
  res.json({
    profile: {
      id: Number(user.id),
      name: String(user.name || ''),
      email: user.email ? String(user.email) : null,
      phone: user.phone ? String(user.phone) : null,
      city: user.city ? String(user.city) : null,
      role: String(user.role || 'student'),
      dob: user.dob || null,
      gender: user.gender ? String(user.gender) : null,
      highestQualification: user.highestQualification ? String(user.highestQualification) : null,
      preferredIntake: user.preferredIntake ? String(user.preferredIntake) : null,
      bio: user.bio ? String(user.bio) : null,
      profilePictureUrl: user.profilePictureUrl ? String(user.profilePictureUrl) : null
    },
    documents: documents.map((row) => ({
      id: Number(row.id),
      documentName: String(row.documentName || 'Document'),
      originalFileName: row.originalFileName ? String(row.originalFileName) : null,
      fileUrl: String(row.fileUrl || ''),
      mimeType: row.mimeType ? String(row.mimeType) : null,
      createdAt: row.createdAt
    })),
    applications: applications.map((row) => ({
      id: Number(row.id),
      programId: row.programId ? Number(row.programId) : null,
      countryId: row.countryId ? Number(row.countryId) : null,
      status: String(row.status || 'submitted'),
      createdAt: row.createdAt,
      programName: row.programName ? String(row.programName) : null,
      universityName: row.universityName ? String(row.universityName) : null,
      countryName: row.countryName ? String(row.countryName) : null
    })),
    interestedStudentsLast6Months: interestedRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ''),
      city: row.city ? String(row.city) : null,
      createdAt: row.createdAt,
      interestUpdatedAt: row.interestUpdatedAt
    })),
    relatedCountryId,
    relatedPrograms: relatedPrograms.map((row) => ({
      id: Number(row.id),
      programName: String(row.programName || ''),
      universityName: String(row.universityName || ''),
      levelOfStudy: row.levelOfStudy ? String(row.levelOfStudy) : null,
      location: row.location ? String(row.location) : null,
      languageOfStudy: row.languageOfStudy ? String(row.languageOfStudy) : null,
      tuitionFeePerYear: row.tuitionFeePerYear ? Number(row.tuitionFeePerYear) : null,
      applicationFee: row.applicationFee ? Number(row.applicationFee) : null,
      intakes: null,
      deadlines: null,
      country: {
        id: Number(row.countryId),
        name: String(row.countryName || ''),
        isoCode: String(row.countryIso || '')
      }
    }))
  });
});

router.put('/student-profile/:userId', async (req, res) => {
  await ensureStudentTables();
  const userId = Number(req.params.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }

  const { name, phone, city, dob, gender, highestQualification, preferredIntake, bio } = req.body || {};
  const nameValue = String(name || '').trim();
  if (!nameValue) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (phone !== undefined && phone) {
    const phoneValue = String(phone).trim();
    const [phoneRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1', [
      phoneValue,
      userId
    ]);
    if (phoneRows.length) {
      return res.status(409).json({ error: 'Another user with this phone already exists' });
    }
  }

  await pool.query<ResultSetHeader>(
    `UPDATE users
     SET name = ?, phone = ?, city = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nameValue, phone ? String(phone).trim() : null, city ? String(city).trim() : null, userId]
  );

  await pool.query<ResultSetHeader>(
    `INSERT INTO student_profiles
      (user_id, dob, gender, highest_qualification, preferred_intake, bio)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      dob = VALUES(dob),
      gender = VALUES(gender),
      highest_qualification = VALUES(highest_qualification),
      preferred_intake = VALUES(preferred_intake),
      bio = VALUES(bio),
      updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      dob ? String(dob).slice(0, 10) : null,
      gender ? String(gender).trim() : null,
      highestQualification ? String(highestQualification).trim() : null,
      preferredIntake ? String(preferredIntake).trim() : null,
      bio ? String(bio).trim() : null
    ]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role,
            sp.dob, sp.gender, sp.highest_qualification AS highestQualification,
            sp.preferred_intake AS preferredIntake, sp.bio, sp.profile_picture_url AS profilePictureUrl
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  const row = rows[0];
  res.json({
    id: Number(row.id),
    name: String(row.name || ''),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    city: row.city ? String(row.city) : null,
    role: String(row.role || 'student'),
    dob: row.dob || null,
    gender: row.gender ? String(row.gender) : null,
    highestQualification: row.highestQualification ? String(row.highestQualification) : null,
    preferredIntake: row.preferredIntake ? String(row.preferredIntake) : null,
    bio: row.bio ? String(row.bio) : null,
    profilePictureUrl: row.profilePictureUrl ? String(row.profilePictureUrl) : null
  });
});

router.post('/student-profile/:userId/profile-picture', async (req, res) => {
  await ensureStudentTables();
  const userId = Number(req.params.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }
  const { fileName, fileBase64, mimeType } = req.body || {};
  if (!fileName || !fileBase64) {
    return res.status(400).json({ error: 'fileName and fileBase64 are required' });
  }

  try {
    const saved = await saveStudentFile({
      userId,
      fileName: String(fileName),
      rawBase64: String(fileBase64),
      mimeType: mimeType ? String(mimeType) : null
    });

    await pool.query<ResultSetHeader>(
      `INSERT INTO student_profiles (user_id, profile_picture_url)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
        profile_picture_url = VALUES(profile_picture_url),
        updated_at = CURRENT_TIMESTAMP`,
      [userId, saved.fileUrl]
    );

    res.status(201).json({ profilePictureUrl: saved.fileUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save file';
    res.status(400).json({ error: message });
  }
});

router.post('/student-documents/:userId', async (req, res) => {
  await ensureStudentTables();
  const userId = Number(req.params.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }
  const { documentName, fileName, fileBase64, mimeType } = req.body || {};
  if (!documentName || !fileName || !fileBase64) {
    return res.status(400).json({ error: 'documentName, fileName and fileBase64 are required' });
  }

  try {
    const saved = await saveStudentFile({
      userId,
      fileName: String(fileName),
      rawBase64: String(fileBase64),
      mimeType: mimeType ? String(mimeType) : null
    });

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO student_documents
        (user_id, document_name, original_file_name, file_url, mime_type)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, String(documentName), String(fileName), saved.fileUrl, saved.mimeType]
    );
    const id = (result as ResultSetHeader).insertId;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, document_name AS documentName, original_file_name AS originalFileName,
              file_url AS fileUrl, mime_type AS mimeType, created_at AS createdAt
       FROM student_documents
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save document';
    res.status(400).json({ error: message });
  }
});

router.delete('/student-documents/:documentId', async (req, res) => {
  await ensureStudentTables();
  const documentId = Number(req.params.documentId);
  const userId = Number(req.query.userId);
  if (!documentId || Number.isNaN(documentId) || !userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Valid documentId and userId are required' });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, file_url AS fileUrl
     FROM student_documents
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [documentId, userId]
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'Document not found' });
  }

  await pool.query<ResultSetHeader>('DELETE FROM student_documents WHERE id = ? AND user_id = ?', [documentId, userId]);

  const fileUrl = String(rows[0].fileUrl || '');
  if (fileUrl.startsWith('/uploads/')) {
    const absolute = path.join(UPLOAD_ROOT, fileUrl.replace('/uploads/', ''));
    try {
      await fs.unlink(absolute);
    } catch {
      // ignore if file was already removed
    }
  }

  res.json({ success: true });
});

export default router;
