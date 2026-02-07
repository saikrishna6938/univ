import { Router } from 'express';
import { pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

const router = Router();

router.post('/', async (req, res) => {
  const { email, name, source } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const emailNorm = String(email).trim().toLowerCase();
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO subscribers (email, name, source)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       source = VALUES(source),
       updated_at = CURRENT_TIMESTAMP`,
    [emailNorm, name || null, source || null]
  );

  res.json({ id: (result as ResultSetHeader).insertId || null, email: emailNorm, name, source });
});

export default router;
