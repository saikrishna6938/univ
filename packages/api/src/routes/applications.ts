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

  const resolvedProgramIdRaw = programId || program?.id || program || null;
  const resolvedProgramId = resolvedProgramIdRaw ? Number(resolvedProgramIdRaw) : null;
  let resolvedUserId = userId || user?.id || user || null;

  if (!resolvedProgramId || Number.isNaN(resolvedProgramId) || !applicantName || !email) {
    return res.status(400).json({ error: 'programId, applicantName and email are required' });
  }

  const emailNorm = String(email).trim().toLowerCase();

  // If userId not explicitly provided, map by email when user exists.
  if (!resolvedUserId) {
    const [userRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);
    if (userRows.length) {
      resolvedUserId = userRows[0].id;
    }
  }

  // If countryId missing, resolve from selected program.
  let resolvedCountryId = countryId || null;
  if (!resolvedCountryId) {
    const [programRows] = await pool.query<RowDataPacket[]>(
      'SELECT country_id AS countryId FROM programs WHERE id = ? LIMIT 1',
      [resolvedProgramId]
    );
    if (programRows.length && programRows[0].countryId) {
      resolvedCountryId = programRows[0].countryId;
    }
  }

  // Check for existing application by user or email for the same program
  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM applications WHERE program_id = ? AND (email = ? OR user_id = ?) LIMIT 1`,
    [resolvedProgramId, emailNorm, resolvedUserId || null]
  );
  if (existing.length) {
    return res.status(200).json({ status: 'exists', applicationId: existing[0].id });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO applications (program_id, country_id, user_id, applicant_name, email, phone, country_of_residence, statement, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resolvedProgramId,
      resolvedCountryId || null,
      resolvedUserId,
      applicantName,
      emailNorm,
      phone ?? null,
      countryOfResidence ?? null,
      statement ?? null,
      notes ?? null
    ]
  );

  const id = (result as ResultSetHeader).insertId;

  // Create task rows for employees who have access to this application's country.
  if (resolvedCountryId) {
    await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO employee_application_tasks (application_id, employee_user_id, task_status)
       SELECT ?, u.id, 'under_process'
       FROM user_country_access uca
       INNER JOIN users u ON u.id = uca.user_id
       LEFT JOIN user_admin_roles ur
         ON ur.user_id = u.id
        AND ur.role = 'employee'
       WHERE uca.country_id = ?
         AND (LOWER(COALESCE(u.role, '')) = 'employee' OR ur.user_id IS NOT NULL)`,
      [id, resolvedCountryId]
    );
  }

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

// GET /api/applications/task-analytics
router.get('/task-analytics', async (_req, res) => {
  const [employeeRows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id AS employeeUserId,
            u.name AS employeeName,
            COUNT(*) AS taskCount
     FROM employee_application_tasks eat
     INNER JOIN users u ON u.id = eat.employee_user_id
     LEFT JOIN user_admin_roles ur
       ON ur.user_id = u.id
      AND ur.role = 'employee'
     WHERE (LOWER(COALESCE(u.role, '')) = 'employee' OR ur.user_id IS NOT NULL)
       AND eat.task_status = 'under_process'
     GROUP BY u.id, u.name
     HAVING taskCount > 0
     ORDER BY taskCount DESC, employeeName ASC
     LIMIT 50`
  );

  const [countryRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(c.name, 'Unknown') AS countryName,
            COUNT(*) AS taskCount
     FROM employee_application_tasks eat
     INNER JOIN applications a ON a.id = eat.application_id
     INNER JOIN users u ON u.id = eat.employee_user_id
     LEFT JOIN user_admin_roles ur
       ON ur.user_id = u.id
      AND ur.role = 'employee'
     LEFT JOIN countries c ON c.id = a.country_id
     WHERE (LOWER(COALESCE(u.role, '')) = 'employee' OR ur.user_id IS NOT NULL)
       AND eat.task_status = 'under_process'
     GROUP BY COALESCE(c.name, 'Unknown')
     ORDER BY taskCount DESC, countryName ASC
     LIMIT 20`
  );

  const [agingRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        SUM(CASE
              WHEN TIMESTAMPDIFF(HOUR, updated_at, CURRENT_TIMESTAMP) < 24 THEN 1
              ELSE 0
            END) AS onTimeCount,
        SUM(CASE
              WHEN TIMESTAMPDIFF(HOUR, updated_at, CURRENT_TIMESTAMP) >= 24
               AND TIMESTAMPDIFF(DAY, updated_at, CURRENT_TIMESTAMP) < 6 THEN 1
              ELSE 0
            END) AS agingCount,
        SUM(CASE
              WHEN TIMESTAMPDIFF(DAY, updated_at, CURRENT_TIMESTAMP) >= 6 THEN 1
              ELSE 0
            END) AS criticalCount,
        COUNT(*) AS totalCount
     FROM employee_application_tasks
     WHERE task_status = 'under_process'`
  );

  const aging = agingRows[0] || {};

  res.json({
    employeeTasks: employeeRows.map((row) => ({
      employeeUserId: Number(row.employeeUserId),
      employeeName: String(row.employeeName || 'Unknown'),
      taskCount: Number(row.taskCount) || 0
    })),
    countryTasks: countryRows.map((row) => ({
      countryName: String(row.countryName || 'Unknown'),
      taskCount: Number(row.taskCount) || 0
    })),
    taskAging: {
      onTime: Number(aging.onTimeCount) || 0,
      aging: Number(aging.agingCount) || 0,
      critical: Number(aging.criticalCount) || 0,
      total: Number(aging.totalCount) || 0
    }
  });
});

// GET /api/applications/employee-tasks?userId=123
router.get('/employee-tasks', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId is required' });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.id,
            a.applicant_name AS applicantName,
            a.email,
            a.phone,
            a.status,
            a.notes,
            a.created_at AS createdAt,
            c.id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIsoCode,
            p.id AS programId,
            p.program_name AS programName,
            p.university_name AS universityName,
            u.id AS linkedUserId,
            u.name AS linkedUserName,
            u.email AS linkedUserEmail,
            u.phone AS linkedUserPhone,
            u.city AS linkedUserCity,
            COALESCE(eat.task_status, 'under_process') AS taskStatus,
            eat.task_notes AS taskNotes,
            eat.updated_at AS taskUpdatedAt,
            CASE
              WHEN COALESCE(eat.task_status, 'under_process') <> 'under_process' THEN NULL
              WHEN TIMESTAMPDIFF(HOUR, COALESCE(eat.updated_at, a.created_at), CURRENT_TIMESTAMP) < 24 THEN 'on_time'
              WHEN TIMESTAMPDIFF(DAY, COALESCE(eat.updated_at, a.created_at), CURRENT_TIMESTAMP) >= 6 THEN 'critical'
              ELSE 'aging'
            END AS taskAgingStatus
     FROM applications a
     INNER JOIN user_country_access uca ON uca.country_id = a.country_id
     LEFT JOIN countries c ON c.id = a.country_id
     LEFT JOIN programs p ON p.id = a.program_id
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN employee_application_tasks eat
       ON eat.application_id = a.id
      AND eat.employee_user_id = ?
     WHERE uca.user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 300`,
    [userId, userId]
  );

  res.json(rows);
});

// PUT /api/applications/employee-tasks/:applicationId
router.put('/employee-tasks/:applicationId', async (req, res) => {
  const applicationId = Number(req.params.applicationId);
  const employeeUserId = Number(req.body?.employeeUserId);
  const taskStatus = String(req.body?.taskStatus || 'under_process');
  const taskNotes = req.body?.taskNotes ? String(req.body.taskNotes) : null;

  if (!applicationId || Number.isNaN(applicationId)) {
    return res.status(400).json({ error: 'Valid applicationId is required' });
  }
  if (!employeeUserId || Number.isNaN(employeeUserId)) {
    return res.status(400).json({ error: 'Valid employeeUserId is required' });
  }
  if (!['under_process', 'completed'].includes(taskStatus)) {
    return res.status(400).json({ error: 'taskStatus must be under_process or completed' });
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO employee_application_tasks (application_id, employee_user_id, task_status, task_notes)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      task_status = VALUES(task_status),
      task_notes = VALUES(task_notes),
      updated_at = CURRENT_TIMESTAMP`,
    [applicationId, employeeUserId, taskStatus, taskNotes]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, application_id AS applicationId, employee_user_id AS employeeUserId,
            task_status AS taskStatus, task_notes AS taskNotes,
            created_at AS createdAt, updated_at AS updatedAt
     FROM employee_application_tasks
     WHERE application_id = ? AND employee_user_id = ?
     LIMIT 1`,
    [applicationId, employeeUserId]
  );

  res.json(rows[0]);
});

export default router;
