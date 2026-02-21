import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();
let ensureScholarshipsTablePromise: Promise<void> | null = null;
const MENU_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', MENU_CACHE_CONTROL);
  }
  next();
});

async function ensureScholarshipsTable() {
  if (!ensureScholarshipsTablePromise) {
    ensureScholarshipsTablePromise = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS scholarships (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          links TEXT NULL,
          duration VARCHAR(120) NULL,
          deadline DATE NULL,
          description TEXT NULL,
          country_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_scholarships_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
          INDEX idx_scholarships_country (country_id),
          INDEX idx_scholarships_deadline (deadline)
        )`
      );
    })().catch((err) => {
      ensureScholarshipsTablePromise = null;
      throw err;
    });
  }
  await ensureScholarshipsTablePromise;
}

// GET /api/scholarships?country=2
router.get('/', async (req, res) => {
  await ensureScholarshipsTable();
  const country = req.query.country ? Number(req.query.country) : null;
  const where: string[] = [];
  const params: Array<number> = [];

  if (country && !Number.isNaN(country)) {
    where.push('s.country_id = ?');
    params.push(country);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id,
            s.name,
            s.links,
            s.duration,
            s.deadline,
            s.description,
            s.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            s.created_at AS createdAt,
            s.updated_at AS updatedAt
     FROM scholarships s
     INNER JOIN countries c ON c.id = s.country_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT 1000`,
    params
  );

  res.json(
    rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ''),
      links: row.links ? String(row.links) : null,
      duration: row.duration ? String(row.duration) : null,
      deadline: row.deadline || null,
      description: row.description ? String(row.description) : null,
      countryId: Number(row.countryId),
      countryName: String(row.countryName || ''),
      countryIso: String(row.countryIso || ''),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))
  );
});

// POST /api/scholarships
router.post('/', async (req, res) => {
  await ensureScholarshipsTable();
  const name = String(req.body?.name || '').trim();
  const links = req.body?.links ? String(req.body.links).trim() : null;
  const duration = req.body?.duration ? String(req.body.duration).trim() : null;
  const deadline = req.body?.deadline ? String(req.body.deadline).slice(0, 10) : null;
  const description = req.body?.description ? String(req.body.description).trim() : null;
  const countryId = Number(req.body?.countryId);

  if (!name || !countryId || Number.isNaN(countryId)) {
    return res.status(400).json({ error: 'name and valid countryId are required' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO scholarships (name, links, duration, deadline, description, country_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, links, duration, deadline, description, countryId]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id,
            s.name,
            s.links,
            s.duration,
            s.deadline,
            s.description,
            s.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            s.created_at AS createdAt,
            s.updated_at AS updatedAt
     FROM scholarships s
     INNER JOIN countries c ON c.id = s.country_id
     WHERE s.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return res.status(500).json({ error: 'Failed to fetch created scholarship' });

  const row = rows[0];
  res.status(201).json({
    id: Number(row.id),
    name: String(row.name || ''),
    links: row.links ? String(row.links) : null,
    duration: row.duration ? String(row.duration) : null,
    deadline: row.deadline || null,
    description: row.description ? String(row.description) : null,
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

// GET /api/scholarships/:id
router.get('/:id', async (req, res) => {
  await ensureScholarshipsTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid scholarship id is required' });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id,
            s.name,
            s.links,
            s.duration,
            s.deadline,
            s.description,
            s.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            s.created_at AS createdAt,
            s.updated_at AS updatedAt
     FROM scholarships s
     INNER JOIN countries c ON c.id = s.country_id
     WHERE s.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Scholarship not found' });
  }

  const row = rows[0];
  res.json({
    id: Number(row.id),
    name: String(row.name || ''),
    links: row.links ? String(row.links) : null,
    duration: row.duration ? String(row.duration) : null,
    deadline: row.deadline || null,
    description: row.description ? String(row.description) : null,
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

// PATCH /api/scholarships/:id
router.patch('/:id', async (req, res) => {
  await ensureScholarshipsTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid scholarship id is required' });
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
  if (req.body?.deadline !== undefined) {
    updates.push('deadline = ?');
    values.push(req.body.deadline ? String(req.body.deadline).slice(0, 10) : null);
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
    `UPDATE scholarships
     SET ${updates.join(', ')}
     WHERE id = ?`,
    [...values, id]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id,
            s.name,
            s.links,
            s.duration,
            s.deadline,
            s.description,
            s.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            s.created_at AS createdAt,
            s.updated_at AS updatedAt
     FROM scholarships s
     INNER JOIN countries c ON c.id = s.country_id
     WHERE s.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Scholarship not found' });

  const row = rows[0];
  res.json({
    id: Number(row.id),
    name: String(row.name || ''),
    links: row.links ? String(row.links) : null,
    duration: row.duration ? String(row.duration) : null,
    deadline: row.deadline || null,
    description: row.description ? String(row.description) : null,
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

// DELETE /api/scholarships/:id
router.delete('/:id', async (req, res) => {
  await ensureScholarshipsTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid scholarship id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM scholarships WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Scholarship not found' });
  }

  res.json({ success: true });
});

export default router;
