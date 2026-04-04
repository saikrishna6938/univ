import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { env } from '../config/env';
import { isMailerConfigured, sendOtpEmail } from '../services/mailer';
import { ensureEntitiesTable } from './entities';

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
type BaseUserRole = 'student' | 'uploaded';
const PANEL_ROLE_PRIORITY: PanelRole[] = ['admin', 'manager', 'employee'];
let ensureAdminRolesAccessPromise: Promise<void> | null = null;

function parseCsv(value: unknown): string[] {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function ensureAdminRolesAccessTable() {
  if (!ensureAdminRolesAccessPromise) {
    ensureAdminRolesAccessPromise = (async () => {
      await pool.query(
        `ALTER TABLE users
         MODIFY COLUMN role VARCHAR(120) NULL DEFAULT 'student'`
      );

      const [leadNameColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM users LIKE 'lead_name'`
      );
      if (!leadNameColumn.length) {
        await pool.query(`ALTER TABLE users ADD COLUMN lead_name VARCHAR(255) NULL AFTER city`);
      }

      const [leadFromColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM users LIKE 'lead_from'`
      );
      if (!leadFromColumn.length) {
        await pool.query(`ALTER TABLE users ADD COLUMN lead_from VARCHAR(255) NULL AFTER lead_name`);
      }

      const [leadEntityIdColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM users LIKE 'lead_entity_id'`
      );
      if (!leadEntityIdColumn.length) {
        await pool.query(`ALTER TABLE users ADD COLUMN lead_entity_id INT NULL AFTER lead_from`);
      }

      await pool.query(
        `ALTER TABLE user_admin_roles
         MODIFY COLUMN role VARCHAR(120) NOT NULL`
      );

      await pool.query(
        `CREATE TABLE IF NOT EXISTS admin_roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role_name VARCHAR(120) NOT NULL UNIQUE,
          role_type VARCHAR(40) NOT NULL DEFAULT 'Default',
          description TEXT NULL,
          enabled TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_admin_roles_enabled (enabled)
        )`
      );

      const [roleTypeColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM admin_roles LIKE 'role_type'`
      );
      if (!roleTypeColumn.length) {
        await pool.query(`ALTER TABLE admin_roles ADD COLUMN role_type VARCHAR(40) NOT NULL DEFAULT 'Default' AFTER role_name`);
      }

      await pool.query(
        `INSERT INTO admin_roles (name, role_name, role_type, description, enabled)
         VALUES
           ('Admin', 'admin', 'Admin', 'Full access to admin operations.', 1),
           ('Manager', 'manager', 'Manager', 'Operational access for management workflows.', 1),
           ('Employee', 'employee', 'Employee', 'Execution access for assigned operational work.', 1),
           ('Student', 'student', 'Student', 'Registered student user role.', 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           role_type = VALUES(role_type),
           description = VALUES(description),
           enabled = VALUES(enabled)`
      );
    })().catch((err) => {
      ensureAdminRolesAccessPromise = null;
      throw err;
    });
  }

  await ensureAdminRolesAccessPromise;
}

async function validateLeadEntity(entityId: number) {
  await ensureEntitiesTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id
     FROM entities e
     INNER JOIN admin_roles ar ON ar.id = e.entity_role_id
     WHERE e.id = ? AND ar.role_type = 'Entity'
     LIMIT 1`,
    [entityId]
  );
  return rows.length > 0;
}

async function getEnabledAdminRoleNames() {
  await ensureAdminRolesAccessTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT role_name AS roleName
     FROM admin_roles
     WHERE enabled = 1
     ORDER BY role_name ASC`
  );
  return new Set(
    rows
      .map((row) => String(row.roleName || '').trim().toLowerCase())
      .filter(Boolean)
  );
}

async function getEnabledAdminRoleTypeMap() {
  await ensureAdminRolesAccessTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT role_name AS roleName, role_type AS roleType
     FROM admin_roles
     WHERE enabled = 1
     ORDER BY role_name ASC`
  );

  return new Map(
    rows
      .map((row) => [
        String(row.roleName || '').trim().toLowerCase(),
        String(row.roleType || '').trim().toLowerCase()
      ] as const)
      .filter(([roleName, roleType]) => Boolean(roleName) && Boolean(roleType))
  );
}

async function getEnabledAssignableRoleNames() {
  const enabledRoles = await getEnabledAdminRoleNames();
  return new Set<string>(
    Array.from(enabledRoles).filter((role) => role !== 'student' && role !== 'uploaded')
  );
}

async function toPanelRoles(input: unknown): Promise<string[]> {
  const valid = await getEnabledAssignableRoleNames();
  const values = Array.isArray(input) ? input : [input];
  const roles = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .flatMap((value) =>
      String(value || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
    )
    .filter((value) => valid.has(value));
  return [...new Set(roles)];
}

function getPrimaryPanelRole(roles: string[]): string | null {
  for (const role of PANEL_ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0] || null;
}

function toBaseUserRole(input: unknown): BaseUserRole | null {
  const value = String(input || '').trim().toLowerCase();
  if (value === 'student' || value === 'uploaded') {
    return value;
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
  const enabledRoleNames = await getEnabledAdminRoleNames();
  const enabledRoleTypeMap = await getEnabledAdminRoleTypeMap();
  const mappedRoles = parseCsv(user.rolesCsv).filter((role) => enabledRoleNames.has(role));
  const fallbackRole = enabledRoleNames.has(String(user.role || '').toLowerCase())
    ? [String(user.role).toLowerCase()]
    : [];
  const panelRoles = [...new Set([...mappedRoles, ...fallbackRole])];
  const normalizedPanelRoleTypes = [...new Set(
    panelRoles
      .map((role) => enabledRoleTypeMap.get(role) || '')
      .filter((roleType): roleType is string => Boolean(roleType))
  )];
  const primaryRole = getPrimaryPanelRole(
    normalizedPanelRoleTypes.map((roleType) => (roleType === 'superadmin' ? 'admin' : roleType)).filter(
      (roleType): roleType is PanelRole => roleType === 'admin' || roleType === 'manager' || roleType === 'employee'
    )
  );

  if (!primaryRole) {
    return res.status(403).json({ error: 'Admin panel access requires an enabled role from admin_roles' });
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
    roles: panelRoles,
    roleTypes: normalizedPanelRoleTypes
  });
});

router.get('/leads-summary', async (req, res) => {
  const viewerUserId = Number(req.query.viewerUserId);
  const reminderWhereParts = [
    `LOWER(COALESCE(u.role, 'student')) = 'uploaded'`,
    `lc.reminder_at IS NOT NULL`,
    `DATE(lc.reminder_at) = CURDATE()`,
    `lc.reminder_done = 0`
  ];
  const reminderValues: number[] = [];

  if (!Number.isNaN(viewerUserId) && viewerUserId > 0) {
    reminderWhereParts.push(`lc.assigned_employee_user_id = ?`);
    reminderValues.push(viewerUserId);
  }

  const [dailyRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count
     FROM users
     WHERE LOWER(COALESCE(role, 'student')) <> 'uploaded'
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`
  );

  const [recentLeadRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, email, phone, city, role, created_at AS createdAt
     FROM users
     WHERE LOWER(COALESCE(role, 'student')) = 'uploaded'
     ORDER BY created_at DESC
     LIMIT 20`
  );

  const [totalRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE LOWER(COALESCE(role, 'student')) = 'uploaded'`
  );
  const [recentLoginRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE LOWER(COALESCE(role, 'student')) <> 'uploaded'
       AND last_login_at IS NOT NULL
       AND last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
  const [locationRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        TRIM(COALESCE(NULLIF(city, ''), 'Unknown')) AS location,
        COUNT(*) AS count
     FROM users
     WHERE LOWER(COALESCE(role, 'student')) <> 'uploaded'
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
            lc.lead_type AS leadType,
            lc.looking_for AS lookingFor,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     WHERE ${reminderWhereParts.join('\n       AND ')}
     ORDER BY lc.reminder_at ASC
     LIMIT 50`,
    reminderValues
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
    recentLeads: recentLeadRows,
    todaysRemindersCount: todayReminderRows.length,
    todaysReminders: todayReminderRows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      userName: String(row.userName || ''),
      userEmail: row.userEmail ? String(row.userEmail) : null,
      userPhone: row.userPhone ? String(row.userPhone) : null,
      conversationStatus: String(row.conversationStatus || 'Awaiting Response'),
      leadType: String(row.leadType || 'WARM') as 'HOT' | 'WARM' | 'COLD',
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

router.get('/users', async (req, res) => {
  await ensureAdminRolesAccessTable();
  await ensureEntitiesTable();
  const kind = String(req.query.kind || 'all').trim().toLowerCase();
  const entityId = Number(req.query.entityId);
  const viewerRoles = String(req.query.viewerRoles || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const whereParts: string[] = [];
  const values: Array<string | number> = [];

  if (kind === 'registered') {
    whereParts.push(`LOWER(COALESCE(u.role, 'student')) <> 'uploaded'`);
  } else if (kind === 'leads') {
    whereParts.push(`LOWER(COALESCE(u.role, 'student')) = 'uploaded'`);
  }

  if (kind === 'leads' && entityId && !Number.isNaN(entityId)) {
    whereParts.push('u.lead_entity_id = ?');
    values.push(entityId);
  }

  if (kind === 'leads' && viewerRoles.length) {
    whereParts.push(`ar.role_type = 'Entity'`);
    whereParts.push(`LOWER(COALESCE(ar.role_name, '')) IN (${viewerRoles.map(() => '?').join(', ')})`);
    values.push(...viewerRoles);
  }

  if (kind === 'registered' && viewerRoles.length) {
    whereParts.push(
      `EXISTS (
         SELECT 1
         FROM user_admin_roles ur_entity
         INNER JOIN admin_roles ar_entity ON ar_entity.role_name = ur_entity.role
         WHERE ur_entity.user_id = u.id
           AND ar_entity.role_type = 'Entity'
           AND LOWER(ur_entity.role) IN (${viewerRoles.map(() => '?').join(', ')})
       )`
    );
    values.push(...viewerRoles);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const limitClause = kind === 'leads' ? '' : 'LIMIT 500';

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.phone, u.city, u.role, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
            u.lead_name AS leadName,
            u.lead_from AS leadFrom,
            u.lead_entity_id AS leadEntityId,
            e.entity_name AS leadEntityName,
            ar.role_name AS leadEntityRoleName,
            GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv,
            GROUP_CONCAT(DISTINCT uca.country_id ORDER BY uca.country_id SEPARATOR ',') AS countryIdsCsv
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
     LEFT JOIN user_country_access uca ON uca.user_id = u.id
     LEFT JOIN entities e ON e.id = u.lead_entity_id
     LEFT JOIN admin_roles ar ON ar.id = e.entity_role_id
     ${whereClause}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     ${limitClause}`,
    values
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
  const { name, email, phone, city, role, roles, countryIds, password, leadName, leadFrom, leadEntityId } = req.body || {};

  const nameValue = String(name || '').trim();
  const emailValue = email ? String(email).trim().toLowerCase() : null;
  const phoneValue = phone ? String(phone).trim() : null;
  const cityValue = city ? String(city).trim() : null;
  const baseRole = toBaseUserRole(role);
  const isLeadCreation = baseRole === 'uploaded';
  const leadNameValue = leadName ? String(leadName).trim() : null;
  const leadFromValue = leadFrom ? String(leadFrom).trim() : null;
  const leadEntityIdValue =
    leadEntityId === undefined || leadEntityId === null || String(leadEntityId).trim() === ''
      ? null
      : Number(leadEntityId);

  if (!nameValue) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!isLeadCreation && !emailValue) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  if (isLeadCreation && (leadNameValue || leadFromValue || leadEntityIdValue !== null)) {
    if (!leadNameValue || !leadFromValue || leadEntityIdValue === null || Number.isNaN(leadEntityIdValue)) {
      return res.status(400).json({ error: 'leadName, leadFrom, and leadEntityId are required for manual lead creation in a lead list' });
    }
  }

  const selectedRoles = await toPanelRoles(roles);
  const fallbackRole = await toPanelRoles(role);
  const mergedRoles = [...new Set([...selectedRoles, ...fallbackRole])];
  const roleValue = getPrimaryPanelRole(mergedRoles) || baseRole || 'student';
  const passwordValue = password ? String(password) : '';

  const needsPassword = mergedRoles.length > 0;
  if (needsPassword && passwordValue.length < 6) {
    return res.status(400).json({ error: 'Password with at least 6 characters is required for admin/manager/employee roles' });
  }

  const passwordHash = passwordValue ? await bcrypt.hash(passwordValue, 10) : null;

  if (isLeadCreation && leadEntityIdValue !== null && !Number.isNaN(leadEntityIdValue)) {
    const [entityRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM entities WHERE id = ? LIMIT 1`,
      [leadEntityIdValue]
    );
    if (!entityRows.length) {
      return res.status(400).json({ error: 'Selected lead entity is invalid' });
    }
  }

  if (emailValue) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [emailValue]);
    if (existing.length) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
  }
  if (phoneValue) {
    const [phoneExisting] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phoneValue]);
    if (phoneExisting.length) {
      return res.status(409).json({ error: 'User with this phone already exists' });
    }
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (name, email, phone, city, lead_name, lead_from, lead_entity_id, role, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nameValue, emailValue, phoneValue, cityValue, leadNameValue, leadFromValue, leadEntityIdValue, roleValue, passwordHash]
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
            u.lead_name AS leadName,
            u.lead_from AS leadFrom,
            u.lead_entity_id AS leadEntityId,
            e.entity_name AS leadEntityName,
            ar.role_name AS leadEntityRoleName,
            GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role SEPARATOR ',') AS rolesCsv,
            GROUP_CONCAT(DISTINCT uca.country_id ORDER BY uca.country_id SEPARATOR ',') AS countryIdsCsv
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id
     LEFT JOIN user_country_access uca ON uca.user_id = u.id
     LEFT JOIN entities e ON e.id = u.lead_entity_id
     LEFT JOIN admin_roles ar ON ar.id = e.entity_role_id
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
  await ensureAdminRolesAccessTable();
  const inputUsers = Array.isArray(req.body?.users) ? req.body.users : [];
  const leadImportMeta = req.body?.leadImportMeta || {};
  if (!inputUsers.length) {
    return res.status(400).json({ error: 'users array is required' });
  }
  if (inputUsers.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 users per upload' });
  }

  const leadName = String(leadImportMeta.leadName || '').trim();
  const leadFrom = String(leadImportMeta.leadFrom || '').trim();
  const leadEntityId = Number(leadImportMeta.leadEntityId);

  if (!leadName || !leadFrom || !leadEntityId || Number.isNaN(leadEntityId)) {
    return res.status(400).json({ error: 'leadName, leadFrom, and leadEntityId are required for CSV upload' });
  }

  const validLeadEntity = await validateLeadEntity(leadEntityId);
  if (!validLeadEntity) {
    return res.status(400).json({ error: 'leadEntityId must reference a valid entity role' });
  }

  const created: RowDataPacket[] = [];
  const failed: Array<{ row: number; email?: string; reason: string }> = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (let index = 0; index < inputUsers.length; index += 1) {
    const source = inputUsers[index] || {};
    const rowNumber = index + 2; // assumes row 1 is header in CSV

    const nameValue = String(source.name || '').trim();
    const emailValue = source.email ? String(source.email).trim().toLowerCase() : null;
    const phoneValue = source.phone ? String(source.phone).trim() : null;
    const cityValue = null;

    if (!nameValue) {
      failed.push({ row: rowNumber, email: emailValue || undefined, reason: 'name is required' });
      continue;
    }

    if (emailValue && seenEmails.has(emailValue)) {
      failed.push({ row: rowNumber, email: emailValue, reason: 'duplicate email in upload' });
      continue;
    }
    if (phoneValue && seenPhones.has(phoneValue)) {
      failed.push({ row: rowNumber, email: emailValue || undefined, reason: 'duplicate phone in upload' });
      continue;
    }

    const roleValue = 'uploaded';
    const passwordValue = 'Student@123';

    if (emailValue) {
      const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [emailValue]);
      if (existing.length) {
        failed.push({ row: rowNumber, email: emailValue, reason: 'duplicate email skipped' });
        continue;
      }
    }
    if (phoneValue) {
      const [phoneExisting] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phoneValue]);
      if (phoneExisting.length) {
        failed.push({ row: rowNumber, email: emailValue || undefined, reason: 'duplicate phone skipped' });
        continue;
      }
    }

    const passwordHash = passwordValue ? await bcrypt.hash(passwordValue, 10) : null;

    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO users (name, email, phone, city, lead_name, lead_from, lead_entity_id, role, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nameValue, emailValue, phoneValue, cityValue, leadName, leadFrom, leadEntityId, roleValue, passwordHash]
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
        if (emailValue) seenEmails.add(emailValue);
        if (phoneValue) seenPhones.add(phoneValue);
      }
    } catch (err) {
      failed.push({
        row: rowNumber,
        email: emailValue || undefined,
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

  const selectedRoles = roles !== undefined ? await toPanelRoles(roles) : [];
  const fallbackRole = role !== undefined ? await toPanelRoles(role) : [];
  const mergedRoles = roles !== undefined || role !== undefined ? [...new Set([...selectedRoles, ...fallbackRole])] : null;
  const baseRole = role !== undefined ? toBaseUserRole(role) : null;

  if (mergedRoles) {
    const roleValue = getPrimaryPanelRole(mergedRoles) || baseRole || 'student';
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
     WHERE lc.lead_type = 'HOT'
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
