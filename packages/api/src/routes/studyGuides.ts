import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();
let ensureStudyGuidesPromise: Promise<void> | null = null;
const MENU_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', MENU_CACHE_CONTROL);
  }
  next();
});

async function ensureStudyGuideTables() {
  if (!ensureStudyGuidesPromise) {
    ensureStudyGuidesPromise = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS study_guide_topics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS study_guides (
          id INT AUTO_INCREMENT PRIMARY KEY,
          topic_id INT NOT NULL,
          country_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          summary TEXT NULL,
          content LONGTEXT NULL,
          links TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_study_guides_topic FOREIGN KEY (topic_id) REFERENCES study_guide_topics(id) ON DELETE CASCADE,
          CONSTRAINT fk_study_guides_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
          INDEX idx_study_guides_topic (topic_id),
          INDEX idx_study_guides_country (country_id)
        )`
      );
    })().catch((err) => {
      ensureStudyGuidesPromise = null;
      throw err;
    });
  }
  await ensureStudyGuidesPromise;
}

router.get('/topics', async (_req, res) => {
  await ensureStudyGuideTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, created_at AS createdAt, updated_at AS updatedAt
     FROM study_guide_topics
     ORDER BY name ASC`
  );
  res.json(rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    description: row.description ? String(row.description) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  })));
});

router.post('/topics', async (req, res) => {
  await ensureStudyGuideTables();
  const name = String(req.body?.name || '').trim();
  const description = req.body?.description ? String(req.body.description).trim() : null;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO study_guide_topics (name, description) VALUES (?, ?)',
    [name, description]
  );
  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, description, created_at AS createdAt, updated_at AS updatedAt FROM study_guide_topics WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  res.status(201).json({
    id: Number(row.id),
    name: String(row.name || ''),
    description: row.description ? String(row.description) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.patch('/topics/:id', async (req, res) => {
  await ensureStudyGuideTables();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'Valid topic id is required' });

  const updates: string[] = [];
  const values: Array<string | null | number> = [];
  if (req.body?.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name cannot be empty' });
    updates.push('name = ?');
    values.push(name);
  }
  if (req.body?.description !== undefined) {
    updates.push('description = ?');
    values.push(req.body.description ? String(req.body.description).trim() : null);
  }
  if (!updates.length) return res.status(400).json({ error: 'No updates provided' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  await pool.query<ResultSetHeader>(`UPDATE study_guide_topics SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, description, created_at AS createdAt, updated_at AS updatedAt FROM study_guide_topics WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Topic not found' });

  const row = rows[0];
  res.json({
    id: Number(row.id),
    name: String(row.name || ''),
    description: row.description ? String(row.description) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.delete('/topics/:id', async (req, res) => {
  await ensureStudyGuideTables();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'Valid topic id is required' });
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM study_guide_topics WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) return res.status(404).json({ error: 'Topic not found' });
  res.json({ success: true });
});

router.get('/', async (req, res) => {
  await ensureStudyGuideTables();
  const country = req.query.country ? Number(req.query.country) : null;
  const topicId = req.query.topicId ? Number(req.query.topicId) : null;

  const where: string[] = [];
  const params: Array<number> = [];
  if (country && !Number.isNaN(country)) {
    where.push('sg.country_id = ?');
    params.push(country);
  }
  if (topicId && !Number.isNaN(topicId)) {
    where.push('sg.topic_id = ?');
    params.push(topicId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sg.id,
            sg.title,
            sg.summary,
            sg.content,
            sg.links,
            sg.topic_id AS topicId,
            t.name AS topicName,
            sg.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            sg.created_at AS createdAt,
            sg.updated_at AS updatedAt
     FROM study_guides sg
     INNER JOIN study_guide_topics t ON t.id = sg.topic_id
     INNER JOIN countries c ON c.id = sg.country_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY sg.created_at DESC, sg.id DESC
     LIMIT 1000`,
    params
  );

  res.json(rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title || ''),
    summary: row.summary ? String(row.summary) : null,
    content: row.content ? String(row.content) : null,
    links: row.links ? String(row.links) : null,
    topicId: Number(row.topicId),
    topicName: String(row.topicName || ''),
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  })));
});

router.get('/:id', async (req, res) => {
  await ensureStudyGuideTables();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'Valid study guide id is required' });

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sg.id,
            sg.title,
            sg.summary,
            sg.content,
            sg.links,
            sg.topic_id AS topicId,
            t.name AS topicName,
            sg.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            sg.created_at AS createdAt,
            sg.updated_at AS updatedAt
     FROM study_guides sg
     INNER JOIN study_guide_topics t ON t.id = sg.topic_id
     INNER JOIN countries c ON c.id = sg.country_id
     WHERE sg.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Study guide not found' });
  const row = rows[0];
  res.json({
    id: Number(row.id),
    title: String(row.title || ''),
    summary: row.summary ? String(row.summary) : null,
    content: row.content ? String(row.content) : null,
    links: row.links ? String(row.links) : null,
    topicId: Number(row.topicId),
    topicName: String(row.topicName || ''),
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.post('/', async (req, res) => {
  await ensureStudyGuideTables();
  const title = String(req.body?.title || '').trim();
  const topicId = Number(req.body?.topicId);
  const countryId = Number(req.body?.countryId);
  const summary = req.body?.summary ? String(req.body.summary).trim() : null;
  const content = req.body?.content ? String(req.body.content).trim() : null;
  const links = req.body?.links ? String(req.body.links).trim() : null;

  if (!title || !topicId || Number.isNaN(topicId) || !countryId || Number.isNaN(countryId)) {
    return res.status(400).json({ error: 'title, topicId and countryId are required' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO study_guides (topic_id, country_id, title, summary, content, links)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [topicId, countryId, title, summary, content, links]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sg.id,
            sg.title,
            sg.summary,
            sg.content,
            sg.links,
            sg.topic_id AS topicId,
            t.name AS topicName,
            sg.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            sg.created_at AS createdAt,
            sg.updated_at AS updatedAt
     FROM study_guides sg
     INNER JOIN study_guide_topics t ON t.id = sg.topic_id
     INNER JOIN countries c ON c.id = sg.country_id
     WHERE sg.id = ?
     LIMIT 1`,
    [id]
  );

  const row = rows[0];
  res.status(201).json({
    id: Number(row.id),
    title: String(row.title || ''),
    summary: row.summary ? String(row.summary) : null,
    content: row.content ? String(row.content) : null,
    links: row.links ? String(row.links) : null,
    topicId: Number(row.topicId),
    topicName: String(row.topicName || ''),
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.patch('/:id', async (req, res) => {
  await ensureStudyGuideTables();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'Valid study guide id is required' });

  const updates: string[] = [];
  const values: Array<string | number | null> = [];

  if (req.body?.title !== undefined) {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title cannot be empty' });
    updates.push('title = ?');
    values.push(title);
  }
  if (req.body?.summary !== undefined) {
    updates.push('summary = ?');
    values.push(req.body.summary ? String(req.body.summary).trim() : null);
  }
  if (req.body?.content !== undefined) {
    updates.push('content = ?');
    values.push(req.body.content ? String(req.body.content).trim() : null);
  }
  if (req.body?.links !== undefined) {
    updates.push('links = ?');
    values.push(req.body.links ? String(req.body.links).trim() : null);
  }
  if (req.body?.topicId !== undefined) {
    const topicId = Number(req.body.topicId);
    if (!topicId || Number.isNaN(topicId)) return res.status(400).json({ error: 'Valid topicId is required' });
    updates.push('topic_id = ?');
    values.push(topicId);
  }
  if (req.body?.countryId !== undefined) {
    const countryId = Number(req.body.countryId);
    if (!countryId || Number.isNaN(countryId)) return res.status(400).json({ error: 'Valid countryId is required' });
    updates.push('country_id = ?');
    values.push(countryId);
  }

  if (!updates.length) return res.status(400).json({ error: 'No updates provided' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  await pool.query<ResultSetHeader>(
    `UPDATE study_guides
     SET ${updates.join(', ')}
     WHERE id = ?`,
    [...values, id]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sg.id,
            sg.title,
            sg.summary,
            sg.content,
            sg.links,
            sg.topic_id AS topicId,
            t.name AS topicName,
            sg.country_id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso,
            sg.created_at AS createdAt,
            sg.updated_at AS updatedAt
     FROM study_guides sg
     INNER JOIN study_guide_topics t ON t.id = sg.topic_id
     INNER JOIN countries c ON c.id = sg.country_id
     WHERE sg.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Study guide not found' });

  const row = rows[0];
  res.json({
    id: Number(row.id),
    title: String(row.title || ''),
    summary: row.summary ? String(row.summary) : null,
    content: row.content ? String(row.content) : null,
    links: row.links ? String(row.links) : null,
    topicId: Number(row.topicId),
    topicName: String(row.topicName || ''),
    countryId: Number(row.countryId),
    countryName: String(row.countryName || ''),
    countryIso: String(row.countryIso || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
});

router.delete('/:id', async (req, res) => {
  await ensureStudyGuideTables();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'Valid study guide id is required' });
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM study_guides WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) return res.status(404).json({ error: 'Study guide not found' });
  res.json({ success: true });
});

export default router;
