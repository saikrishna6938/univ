import { Router } from 'express';
import crypto from 'crypto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

  // In production you would email/SMS the OTP. Here we return it for testing convenience.
  res.json({ message: 'OTP sent', expiresInSeconds: 600, otp: code });
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

export default router;
