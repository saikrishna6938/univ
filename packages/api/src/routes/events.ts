import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

// Public shape (kept compatible with old events.json structure)
router.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, degree, program, university, logo, title, event_date AS eventDate
     FROM events
     ORDER BY university ASC, program ASC, event_date ASC, id ASC`
  );

  const grouped = new Map<string, { degree: string; program: string; university: string; logo: string | null; events: Array<{ title: string; date: string }> }>();

  rows.forEach((row) => {
    const degree = String(row.degree || '');
    const program = String(row.program || '');
    const university = String(row.university || '');
    const logo = row.logo ? String(row.logo) : null;
    const key = `${degree}||${program}||${university}||${logo || ''}`;
    const eventDate = row.eventDate ? new Date(row.eventDate).toISOString().slice(0, 10) : '';

    if (!grouped.has(key)) {
      grouped.set(key, {
        degree,
        program,
        university,
        logo,
        events: []
      });
    }

    grouped.get(key)?.events.push({
      title: String(row.title || ''),
      date: eventDate
    });
  });

  res.json(Array.from(grouped.values()));
});

// Admin list (flat rows)
router.get('/admin', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, degree, program, university, logo, title, event_date AS eventDate, created_at AS createdAt
     FROM events
     ORDER BY event_date ASC, id DESC
     LIMIT 500`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const degree = String(req.body?.degree || '').trim();
  const program = String(req.body?.program || '').trim();
  const university = String(req.body?.university || '').trim();
  const logo = req.body?.logo ? String(req.body.logo).trim() : null;
  const title = String(req.body?.title || '').trim();
  const eventDate = String(req.body?.eventDate || '').trim();

  if (!degree || !program || !university || !title || !eventDate) {
    return res.status(400).json({ error: 'degree, program, university, title, eventDate are required' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO events (degree, program, university, logo, title, event_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [degree, program, university, logo, title, eventDate]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, degree, program, university, logo, title, event_date AS eventDate, created_at AS createdAt
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }

  const updates: string[] = [];
  const values: Array<string | null> = [];

  const maybeSet = (field: 'degree' | 'program' | 'university' | 'logo' | 'title' | 'eventDate') => {
    if (req.body?.[field] === undefined) return;
    if (field === 'logo') {
      updates.push('logo = ?');
      values.push(req.body.logo ? String(req.body.logo).trim() : null);
      return;
    }
    const value = String(req.body[field] || '').trim();
    if (!value) return;
    if (field === 'eventDate') updates.push('event_date = ?');
    else updates.push(`${field} = ?`);
    values.push(value);
  };

  maybeSet('degree');
  maybeSet('program');
  maybeSet('university');
  maybeSet('logo');
  maybeSet('title');
  maybeSet('eventDate');

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  await pool.query<ResultSetHeader>(
    `UPDATE events
     SET ${updates.join(', ')}
     WHERE id = ?`,
    [...values, String(id)]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, degree, program, university, logo, title, event_date AS eventDate, created_at AS createdAt
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM events WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json({ success: true });
});

export default router;
