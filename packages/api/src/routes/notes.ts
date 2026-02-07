import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, title, body, created_at AS createdAt, updated_at AS updatedAt FROM notes ORDER BY created_at DESC'
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, body = '' } = req.body;
  const [result] = await pool.query<ResultSetHeader>('INSERT INTO notes (title, body) VALUES (?, ?)', [title, body]);
  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, title, body, created_at AS createdAt, updated_at AS updatedAt FROM notes WHERE id = ?',
    [id]
  );
  res.status(201).json(rows[0]);
});

export default router;
