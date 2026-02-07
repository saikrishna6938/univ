import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, iso_code AS isoCode, created_at AS createdAt, updated_at AS updatedAt FROM countries ORDER BY name ASC'
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, isoCode } = req.body;
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO countries (name, iso_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
    [name, isoCode?.toUpperCase()]
  );
  const id = (result as ResultSetHeader).insertId || (await getCountryId(isoCode));
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, iso_code AS isoCode, created_at AS createdAt, updated_at AS updatedAt FROM countries WHERE id = ?',
    [id]
  );
  res.status(201).json(rows[0]);
});

async function getCountryId(isoCode?: string) {
  if (!isoCode) return null;
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM countries WHERE iso_code = ? LIMIT 1', [
    isoCode.toUpperCase()
  ]);
  return rows.length ? rows[0].id : null;
}

export default router;
