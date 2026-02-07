import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

// POST /api/applications
router.post('/', async (req, res) => {
  const {
    programId,
    program,
    userId,
    user,
    applicantName,
    email,
    phone,
    countryOfResidence,
    countryId,
    statement,
    notes
  } = req.body;

  const resolvedProgramId = programId || program?.id || program || null;
  const resolvedUserId = userId || user?.id || user || null;

  if (!resolvedProgramId || !applicantName || !email) {
    return res.status(400).json({ error: 'programId, applicantName and email are required' });
  }

  // Check for existing application by user or email for the same program
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM applications WHERE program_id = ? AND (email = ? OR user_id = ?) LIMIT 1`,
    [resolvedProgramId, email, resolvedUserId || null]
  );
  if (existing.length) {
    return res.status(200).json({ status: 'exists', applicationId: existing[0].id });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO applications (program_id, country_id, user_id, applicant_name, email, phone, country_of_residence, statement, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resolvedProgramId,
      countryId || null,
      resolvedUserId,
      applicantName,
      email,
      phone ?? null,
      countryOfResidence ?? null,
      statement ?? null,
      notes ?? null
    ]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.id, a.program_id AS programId, a.user_id AS userId, a.applicant_name AS applicantName,
            a.email, a.phone, a.country_of_residence AS countryOfResidence, a.statement, a.notes, a.status,
            a.created_date AS createdDate, a.created_at AS createdAt, a.updated_at AS updatedAt
     FROM applications a WHERE a.id = ?`,
    [id]
  );

  res.status(201).json(rows[0]);
});

// GET /api/applications (admin view)
router.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.id, a.applicant_name AS applicantName, a.email, a.phone, a.country_of_residence AS countryOfResidence,
            a.statement, a.status, a.created_at AS createdAt, a.updated_at AS updatedAt,
            p.program_name AS programName, p.university_name AS universityName,
            u.name AS userName, u.email AS userEmail
     FROM applications a
     LEFT JOIN programs p ON a.program_id = p.id
     LEFT JOIN users u ON a.user_id = u.id
     ORDER BY a.created_at DESC
     LIMIT 100`
  );

  res.json(rows);
});

export default router;
