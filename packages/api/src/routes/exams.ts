import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();
let ensureExamsTablePromise: Promise<void> | null = null;
const MENU_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', MENU_CACHE_CONTROL);
  }
  next();
});

async function ensureExamsTable() {
  if (!ensureExamsTablePromise) {
    ensureExamsTablePromise = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS exams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          links TEXT NULL,
          duration VARCHAR(120) NULL,
          exam_date DATE NULL,
          description TEXT NULL,
          country_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_exams_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
          INDEX idx_exams_country (country_id),
          INDEX idx_exams_exam_date (exam_date)
        )`
      );
    })().catch((err) => {
      ensureExamsTablePromise = null;
      throw err;
    });
  }
  await ensureExamsTablePromise;
}

router.get('/', async (req, res) => {
  await ensureExamsTable();
  const country = req.query.country ? Number(req.query.country) : null;
  const where: string[] = [];
  const params: Array<number> = [];

  if (country && !Number.isNaN(country)) {
    where.push('e.country_id = ?');
    params.push(country);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.name,
            e.links,
            e.duration,
            e.exam_date AS examDate,
            e.description,
            e.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM exams e
     INNER JOIN countries c ON c.id = e.country_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT 1000`,
    params
  );

  res.json(
    rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ''),
      links: row.links ? String(row.links) : null,
      duration: row.duration ? String(row.duration) : null,
      examDate: row.examDate || null,
      description: row.description ? String(row.description) : null,
      countryId: Number(row.countryId),
      countryName: String(row.countryName || ''),
      countryIso: String(row.countryIso || ''),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  );
});

router.post('/', async (req, res) => {
  await ensureExamsTable();
  const name = String(req.body?.name || '').trim();
  const links = req.body?.links ? String(req.body.links).trim() : null;
  const duration = req.body?.duration ? String(req.body.duration).trim() : null;
  const examDate = req.body?.examDate ? String(req.body.examDate).slice(0, 10) : null;
  const description = req.body?.description ? String(req.body.description).trim() : null;
  const countryId = Number(req.body?.countryId);

  if (!name || !countryId || Number.isNaN(countryId)) {
    return res.status(400).json({ error: 'name and valid countryId are required' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO exams (name, links, duration, exam_date, description, country_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, links, duration, examDate, description, countryId]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.name,
            e.links,
            e.duration,
            e.exam_date AS examDate,
            e.description,
            e.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM exams e
     INNER JOIN countries c ON c.id = e.country_id
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return res.status(500).json({ error: 'Failed to fetch created exam' });

  const row = rows[0];
  res.status(201).json({
    id: Number(row.id),
    name: String(row.name || ''),
    links: row.links ? String(row.links) : null,
    duration: row.duration ? String(row.duration) : null,
    examDate: row.examDate || null,
    description: row.description ? String(row.description) : null,
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.get('/:id', async (req, res) => {
  await ensureExamsTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid exam id is required' });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.name,
            e.links,
            e.duration,
            e.exam_date AS examDate,
            e.description,
            e.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM exams e
     INNER JOIN countries c ON c.id = e.country_id
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  const row = rows[0];
  res.json({
    id: Number(row.id),
    name: String(row.name || ''),
    links: row.links ? String(row.links) : null,
    duration: row.duration ? String(row.duration) : null,
    examDate: row.examDate || null,
    description: row.description ? String(row.description) : null,
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.patch('/:id', async (req, res) => {
  await ensureExamsTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid exam id is required' });
  }

  const updates: string[] = [];
  const values: Array<string | number | null> = [];

  if (req.body?.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name cannot be empty' });
    updates.push('name = ?');
    values.push(name);
  }
  if (req.body?.links !== undefined) {
    updates.push('links = ?');
    values.push(req.body.links ? String(req.body.links).trim() : null);
  }
  if (req.body?.duration !== undefined) {
    updates.push('duration = ?');
    values.push(req.body.duration ? String(req.body.duration).trim() : null);
  }
  if (req.body?.examDate !== undefined) {
    updates.push('exam_date = ?');
    values.push(req.body.examDate ? String(req.body.examDate).slice(0, 10) : null);
  }
  if (req.body?.description !== undefined) {
    updates.push('description = ?');
    values.push(req.body.description ? String(req.body.description).trim() : null);
  }
  if (req.body?.countryId !== undefined) {
    const countryId = Number(req.body.countryId);
    if (!countryId || Number.isNaN(countryId)) {
      return res.status(400).json({ error: 'Valid countryId is required' });
    }
    updates.push('country_id = ?');
    values.push(countryId);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  await pool.query<ResultSetHeader>(
    `UPDATE exams
     SET ${updates.join(', ')}
     WHERE id = ?`,
    [...values, id]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.name,
            e.links,
            e.duration,
            e.exam_date AS examDate,
            e.description,
            e.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM exams e
     INNER JOIN countries c ON c.id = e.country_id
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Exam not found' });

  const row = rows[0];
  res.json({
    id: Number(row.id),
    name: String(row.name || ''),
    links: row.links ? String(row.links) : null,
    duration: row.duration ? String(row.duration) : null,
    examDate: row.examDate || null,
    description: row.description ? String(row.description) : null,
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.delete('/:id', async (req, res) => {
  await ensureExamsTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid exam id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM exams WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  res.json({ success: true });
});

export default router;
