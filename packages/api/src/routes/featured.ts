import { Router } from 'express';
import { pool } from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT fu.id,
            fu.university_image AS universityImage,
            fu.discount_on_application_fees AS discount,
            fu.application_fee AS applicationFee,
            p.id AS programId,
            p.program_name AS programName,
            p.university_name AS universityName,
            c.id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso
     FROM featured_universities fu
     JOIN programs p ON fu.program_id = p.id
     JOIN countries c ON fu.country_id = c.id
     ORDER BY fu.created_at DESC
     LIMIT 50`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const countryId = Number(req.body?.countryId);
  const programId = Number(req.body?.programId);
  const universityImage = req.body?.universityImage ? String(req.body.universityImage).trim() : null;
  const applicationFee = req.body?.applicationFee === null || req.body?.applicationFee === undefined || req.body?.applicationFee === ''
    ? null
    : Number(req.body.applicationFee);
  const discount = req.body?.discount === null || req.body?.discount === undefined || req.body?.discount === ''
    ? null
    : Number(req.body.discount);

  if (!countryId || Number.isNaN(countryId) || !programId || Number.isNaN(programId)) {
    return res.status(400).json({ error: 'countryId and programId are required' });
  }
  if (applicationFee !== null && Number.isNaN(applicationFee)) {
    return res.status(400).json({ error: 'applicationFee must be a valid number' });
  }
  if (discount !== null && Number.isNaN(discount)) {
    return res.status(400).json({ error: 'discount must be a valid number' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO featured_universities (country_id, program_id, university_image, application_fee, discount_on_application_fees)
     VALUES (?, ?, ?, ?, ?)`,
    [countryId, programId, universityImage, applicationFee, discount]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT fu.id,
            fu.university_image AS universityImage,
            fu.discount_on_application_fees AS discount,
            fu.application_fee AS applicationFee,
            p.id AS programId,
            p.program_name AS programName,
            p.university_name AS universityName,
            c.id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso
     FROM featured_universities fu
     JOIN programs p ON fu.program_id = p.id
     JOIN countries c ON fu.country_id = c.id
     WHERE fu.id = ?
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
  const values: Array<string | number | null> = [];

  if (req.body?.countryId !== undefined) {
    const countryId = Number(req.body.countryId);
    if (!countryId || Number.isNaN(countryId)) {
      return res.status(400).json({ error: 'countryId must be a valid number' });
    }
    updates.push('country_id = ?');
    values.push(countryId);
  }

  if (req.body?.programId !== undefined) {
    const programId = Number(req.body.programId);
    if (!programId || Number.isNaN(programId)) {
      return res.status(400).json({ error: 'programId must be a valid number' });
    }
    updates.push('program_id = ?');
    values.push(programId);
  }

  if (req.body?.universityImage !== undefined) {
    const universityImage = req.body.universityImage ? String(req.body.universityImage).trim() : null;
    updates.push('university_image = ?');
    values.push(universityImage);
  }

  if (req.body?.applicationFee !== undefined) {
    const applicationFee = req.body.applicationFee === null || req.body.applicationFee === '' ? null : Number(req.body.applicationFee);
    if (applicationFee !== null && Number.isNaN(applicationFee)) {
      return res.status(400).json({ error: 'applicationFee must be a valid number' });
    }
    updates.push('application_fee = ?');
    values.push(applicationFee);
  }

  if (req.body?.discount !== undefined) {
    const discount = req.body.discount === null || req.body.discount === '' ? null : Number(req.body.discount);
    if (discount !== null && Number.isNaN(discount)) {
      return res.status(400).json({ error: 'discount must be a valid number' });
    }
    updates.push('discount_on_application_fees = ?');
    values.push(discount);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  await pool.query<ResultSetHeader>(
    `UPDATE featured_universities
     SET ${updates.join(', ')}
     WHERE id = ?`,
    [...values, id]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT fu.id,
            fu.university_image AS universityImage,
            fu.discount_on_application_fees AS discount,
            fu.application_fee AS applicationFee,
            p.id AS programId,
            p.program_name AS programName,
            p.university_name AS universityName,
            c.id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso
     FROM featured_universities fu
     JOIN programs p ON fu.program_id = p.id
     JOIN countries c ON fu.country_id = c.id
     WHERE fu.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Featured university not found' });
  }

  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM featured_universities WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Featured university not found' });
  }

  res.json({ success: true });
});

export default router;
