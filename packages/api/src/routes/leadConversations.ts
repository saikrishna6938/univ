import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();
let ensureLeadConversationSchemaPromise: Promise<void> | null = null;

const ALLOWED_STATUSES = [
  'Very Interested',
  'Interested – Call Back',
  'Interested – Send Details',
  'Ready for Application',
  'Requested Meeting',
  'Referred to Friend',
  'Need More Time',
  'Comparing Options',
  'Discussing with Family / Partner',
  'Financial Planning in Process',
  'Waiting for Results (IELTS / Exams / Documents)',
  'Follow Up Later',
  'Interested for Next Intake',
  'Not Interested',
  'Budget Issue',
  'Going with Competitor',
  'Change of Plans',
  'Course Not Suitable',
  'Country Not Preferred',
  'Already Enrolled Elsewhere',
  'Fake / Invalid Lead',
  'Connected',
  'Service not available',
  'Call Not Answered',
  'Call Disconnected',
  'Switched Off',
  'Number Busy',
  'Wrong Number',
  'WhatsApp Sent',
  'Left Voicemail',
  'Awaiting Response',
  'Closed'
] as const;
type ConversationStatus = (typeof ALLOWED_STATUSES)[number];
type LeadType = 'HOT' | 'WARM' | 'COLD';
const DEFAULT_STATUS: ConversationStatus = 'Awaiting Response';
const HOT_STATUSES = new Set<ConversationStatus>([
  'Very Interested',
  'Interested – Call Back',
  'Interested – Send Details',
  'Ready for Application',
  'Requested Meeting',
  'Referred to Friend'
]);
const WARM_STATUSES = new Set<ConversationStatus>([
  'Need More Time',
  'Comparing Options',
  'Discussing with Family / Partner',
  'Financial Planning in Process',
  'Waiting for Results (IELTS / Exams / Documents)',
  'Follow Up Later',
  'Interested for Next Intake',
  'Connected',
  'Service not available',
  'Call Not Answered',
  'Call Disconnected',
  'Switched Off',
  'Number Busy',
  'WhatsApp Sent',
  'Left Voicemail',
  'Awaiting Response'
]);

type LeadConversationRow = RowDataPacket & {
  id: number;
  userId: number;
  lookingFor: string | null;
  conversationStatus: ConversationStatus;
  leadType: LeadType;
  notes: string | null;
  reminderAt: string | null;
  reminderDone: number;
  lastContactedAt: string | null;
  assignedEmployeeUserId: number | null;
  assignedEmployeeName: string | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userCity?: string;
  userPreferredCountry?: string;
  userProgramLevel?: string;
  userCourseField?: string;
  userLeadIntake?: string;
  userBudget?: string;
  userLeadFrom?: string;
};

async function ensureLeadConversationSchema() {
  if (!ensureLeadConversationSchemaPromise) {
    ensureLeadConversationSchemaPromise = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS lead_conversations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          looking_for TEXT NULL,
          conversation_status VARCHAR(120) NOT NULL DEFAULT 'Awaiting Response',
          lead_type VARCHAR(10) NOT NULL DEFAULT 'WARM',
          notes TEXT NULL,
          reminder_at DATETIME NULL,
          reminder_done TINYINT(1) DEFAULT 0,
          last_contacted_at DATETIME NULL,
          assigned_employee_user_id INT NULL,
          assigned_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_lead_conversation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_lead_conversation_assigned_employee FOREIGN KEY (assigned_employee_user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_lead_conversation_reminder (reminder_at, reminder_done),
          INDEX idx_lead_conversation_status (conversation_status),
          INDEX idx_lead_conversation_assigned_employee (assigned_employee_user_id)
        )`
      );

      const [assignedEmployeeColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM lead_conversations LIKE 'assigned_employee_user_id'`
      );
      if (!assignedEmployeeColumn.length) {
        await pool.query(
          `ALTER TABLE lead_conversations
           ADD COLUMN assigned_employee_user_id INT NULL,
           ADD CONSTRAINT fk_lead_conversation_assigned_employee
             FOREIGN KEY (assigned_employee_user_id) REFERENCES users(id) ON DELETE SET NULL,
           ADD INDEX idx_lead_conversation_assigned_employee (assigned_employee_user_id)`
        );
      }

      const [assignedAtColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM lead_conversations LIKE 'assigned_at'`
      );
      if (!assignedAtColumn.length) {
        await pool.query(`ALTER TABLE lead_conversations ADD COLUMN assigned_at DATETIME NULL AFTER assigned_employee_user_id`);
      }

      const [leadTypeColumn] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM lead_conversations LIKE 'lead_type'`);
      if (!leadTypeColumn.length) {
        await pool.query(`ALTER TABLE lead_conversations ADD COLUMN lead_type VARCHAR(10) NOT NULL DEFAULT 'WARM' AFTER conversation_status`);
      }

      await pool.query(`ALTER TABLE lead_conversations MODIFY COLUMN conversation_status VARCHAR(120) NOT NULL DEFAULT 'Awaiting Response'`);

      await pool.query(
        `UPDATE lead_conversations
         SET lead_type = CASE
           WHEN conversation_status IN (${Array.from(HOT_STATUSES).map(() => '?').join(', ')}) THEN 'HOT'
           WHEN conversation_status IN (${Array.from(WARM_STATUSES).map(() => '?').join(', ')}) THEN 'WARM'
           ELSE 'COLD'
         END`
        ,
        [...Array.from(HOT_STATUSES), ...Array.from(WARM_STATUSES)]
      );

      const userLeadColumns: Array<[string, string]> = [
        ['preferred_country', `ALTER TABLE users ADD COLUMN preferred_country VARCHAR(255) NULL AFTER lead_entity_id`],
        ['program_level', `ALTER TABLE users ADD COLUMN program_level VARCHAR(255) NULL AFTER preferred_country`],
        ['course_field', `ALTER TABLE users ADD COLUMN course_field VARCHAR(255) NULL AFTER program_level`],
        ['lead_intake', `ALTER TABLE users ADD COLUMN lead_intake VARCHAR(120) NULL AFTER course_field`],
        ['budget', `ALTER TABLE users ADD COLUMN budget VARCHAR(120) NULL AFTER lead_intake`]
      ];

      for (const [columnName, query] of userLeadColumns) {
        const [columnRows] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM users LIKE ?`, [columnName]);
        if (!columnRows.length) {
          await pool.query(query);
        }
      }
    })().catch((error) => {
      ensureLeadConversationSchemaPromise = null;
      throw error;
    });
  }

  await ensureLeadConversationSchemaPromise;
}

function normalizeStatus(value: unknown): ConversationStatus {
  const input = String(value || '').trim();
  if (ALLOWED_STATUSES.includes(input as ConversationStatus)) {
    return input as ConversationStatus;
  }
  return DEFAULT_STATUS;
}

function getLeadType(status: ConversationStatus): LeadType {
  if (HOT_STATUSES.has(status)) return 'HOT';
  if (WARM_STATUSES.has(status)) return 'WARM';
  return 'COLD';
}

function toMySqlDateTime(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized.replace('T', ' ')}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.replace('T', ' ');
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid datetime value');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function rowToConversation(row: LeadConversationRow) {
  return {
    id: row.id,
    userId: row.userId,
    lookingFor: row.lookingFor,
    conversationStatus: row.conversationStatus,
    leadType: row.leadType || getLeadType(row.conversationStatus),
    notes: row.notes,
    reminderAt: row.reminderAt,
    reminderDone: Boolean(row.reminderDone),
    lastContactedAt: row.lastContactedAt,
    assignedEmployeeUserId: row.assignedEmployeeUserId,
    assignedAt: row.assignedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assignedEmployee: row.assignedEmployeeUserId
      ? {
          id: Number(row.assignedEmployeeUserId),
          name: row.assignedEmployeeName || 'Employee'
        }
      : undefined,
    user: row.userName
      ? {
          name: row.userName,
          email: row.userEmail,
          phone: row.userPhone,
          city: row.userCity,
          preferredCountry: row.userPreferredCountry,
          programLevel: row.userProgramLevel,
          courseField: row.userCourseField,
          intake: row.userLeadIntake,
          budget: row.userBudget,
          sourceOfLead: row.userLeadFrom
        }
      : undefined
  };
}

router.get('/', async (req, res) => {
  await ensureLeadConversationSchema();
  const kind = String(req.query.kind || 'all').trim().toLowerCase();
  const whereClause =
    kind === 'leads'
      ? `WHERE LOWER(COALESCE(u.role, 'student')) = 'uploaded'`
      : kind === 'registered'
        ? `WHERE LOWER(COALESCE(u.role, 'student')) <> 'uploaded'`
        : '';
  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.lead_type AS leadType,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt,
            lc.reminder_done AS reminderDone,
            DATE_FORMAT(lc.last_contacted_at, '%Y-%m-%d %H:%i:%s') AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            DATE_FORMAT(lc.assigned_at, '%Y-%m-%d %H:%i:%s') AS assignedAt,
            DATE_FORMAT(lc.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
            DATE_FORMAT(lc.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity,
            u.preferred_country AS userPreferredCountry,
            u.program_level AS userProgramLevel,
            u.course_field AS userCourseField,
            u.lead_intake AS userLeadIntake,
            u.budget AS userBudget,
            u.lead_from AS userLeadFrom
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     ${whereClause}
     ORDER BY lc.updated_at DESC`
  );

  res.json(rows.map(rowToConversation));
});

router.get('/:userId', async (req, res) => {
  await ensureLeadConversationSchema();
  const userId = Number(req.params.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.lead_type AS leadType,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt,
            lc.reminder_done AS reminderDone,
            DATE_FORMAT(lc.last_contacted_at, '%Y-%m-%d %H:%i:%s') AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            DATE_FORMAT(lc.assigned_at, '%Y-%m-%d %H:%i:%s') AS assignedAt,
            DATE_FORMAT(lc.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
            DATE_FORMAT(lc.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity,
            u.preferred_country AS userPreferredCountry,
            u.program_level AS userProgramLevel,
            u.course_field AS userCourseField,
            u.lead_intake AS userLeadIntake,
            u.budget AS userBudget,
            u.lead_from AS userLeadFrom
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Lead conversation not found' });
  }

  res.json(rowToConversation(rows[0]));
});

router.post('/:userId/take', async (req, res) => {
  await ensureLeadConversationSchema();
  const userId = Number(req.params.userId);
  const employeeUserId = Number(req.body?.employeeUserId);

  if (!userId || Number.isNaN(userId) || !employeeUserId || Number.isNaN(employeeUserId)) {
    return res.status(400).json({ error: 'Valid user id and employeeUserId are required' });
  }

  const [employeeRows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.name
     FROM users u
     LEFT JOIN user_admin_roles ur ON ur.user_id = u.id AND ur.role = 'employee'
     WHERE u.id = ?
       AND (LOWER(COALESCE(u.role, '')) = 'employee' OR ur.user_id IS NOT NULL)
     LIMIT 1`,
    [employeeUserId]
  );
  if (!employeeRows.length) {
    return res.status(400).json({ error: 'Employee not found' });
  }

  const [userRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!userRows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO lead_conversations
      (user_id, looking_for, conversation_status, lead_type, notes, reminder_at, reminder_done, last_contacted_at, assigned_employee_user_id, assigned_at)
     VALUES (?, NULL, ?, ?, NULL, NULL, 0, NULL, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
      assigned_employee_user_id = IF(
        assigned_employee_user_id IS NULL OR assigned_employee_user_id = VALUES(assigned_employee_user_id),
        VALUES(assigned_employee_user_id),
        assigned_employee_user_id
      ),
      assigned_at = IF(
        assigned_employee_user_id IS NULL OR assigned_employee_user_id = VALUES(assigned_employee_user_id),
        COALESCE(assigned_at, VALUES(assigned_at)),
        assigned_at
      ),
      updated_at = CURRENT_TIMESTAMP`,
    [userId, DEFAULT_STATUS, getLeadType(DEFAULT_STATUS), employeeUserId]
  );

  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.lead_type AS leadType,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt,
            lc.reminder_done AS reminderDone,
            DATE_FORMAT(lc.last_contacted_at, '%Y-%m-%d %H:%i:%s') AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            DATE_FORMAT(lc.assigned_at, '%Y-%m-%d %H:%i:%s') AS assignedAt,
            DATE_FORMAT(lc.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
            DATE_FORMAT(lc.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity,
            u.preferred_country AS userPreferredCountry,
            u.program_level AS userProgramLevel,
            u.course_field AS userCourseField,
            u.lead_intake AS userLeadIntake,
            u.budget AS userBudget,
            u.lead_from AS userLeadFrom
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return res.status(500).json({ error: 'Failed to assign lead' });
  }

  const conversation = rowToConversation(rows[0]);
  if (conversation.assignedEmployeeUserId !== employeeUserId) {
    return res.status(409).json({ error: `${conversation.assignedEmployee?.name || 'Another employee'} already took this lead` });
  }

  res.json(conversation);
});

router.post('/:userId/release', async (req, res) => {
  await ensureLeadConversationSchema();
  const userId = Number(req.params.userId);
  const employeeUserId = Number(req.body?.employeeUserId);

  if (!userId || Number.isNaN(userId) || !employeeUserId || Number.isNaN(employeeUserId)) {
    return res.status(400).json({ error: 'Valid user id and employeeUserId are required' });
  }

  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.lead_type AS leadType,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt,
            lc.reminder_done AS reminderDone,
            DATE_FORMAT(lc.last_contacted_at, '%Y-%m-%d %H:%i:%s') AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            DATE_FORMAT(lc.assigned_at, '%Y-%m-%d %H:%i:%s') AS assignedAt,
            DATE_FORMAT(lc.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
            DATE_FORMAT(lc.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity,
            u.preferred_country AS userPreferredCountry,
            u.program_level AS userProgramLevel,
            u.course_field AS userCourseField,
            u.lead_intake AS userLeadIntake,
            u.budget AS userBudget,
            u.lead_from AS userLeadFrom
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Lead conversation not found' });
  }

  const existingConversation = rowToConversation(rows[0]);
  if (!existingConversation.assignedEmployeeUserId) {
    return res.json(existingConversation);
  }

  if (existingConversation.assignedEmployeeUserId !== employeeUserId) {
    return res.status(409).json({ error: `${existingConversation.assignedEmployee?.name || 'Another employee'} already took this lead` });
  }

  await pool.query<ResultSetHeader>(
    `UPDATE lead_conversations
     SET assigned_employee_user_id = NULL,
         assigned_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND assigned_employee_user_id = ?`,
    [userId, employeeUserId]
  );

  const [updatedRows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.lead_type AS leadType,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt,
            lc.reminder_done AS reminderDone,
            DATE_FORMAT(lc.last_contacted_at, '%Y-%m-%d %H:%i:%s') AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            DATE_FORMAT(lc.assigned_at, '%Y-%m-%d %H:%i:%s') AS assignedAt,
            DATE_FORMAT(lc.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
            DATE_FORMAT(lc.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity,
            u.preferred_country AS userPreferredCountry,
            u.program_level AS userProgramLevel,
            u.course_field AS userCourseField,
            u.lead_intake AS userLeadIntake,
            u.budget AS userBudget,
            u.lead_from AS userLeadFrom
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!updatedRows.length) {
    return res.status(500).json({ error: 'Failed to release lead' });
  }

  res.json(rowToConversation(updatedRows[0]));
});

router.put('/:userId', async (req, res) => {
  await ensureLeadConversationSchema();
  const userId = Number(req.params.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const [userRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!userRows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const body = req.body || {};
  const lookingFor = body.lookingFor === '' ? null : body.lookingFor ?? null;
  const notes = body.notes === '' ? null : body.notes ?? null;
  const userName = body.name === undefined ? undefined : String(body.name || '').trim();
  const userEmail = body.email === undefined ? undefined : (body.email ? String(body.email).trim().toLowerCase() : null);
  const userPhone = body.phone === undefined ? undefined : (body.phone ? String(body.phone).trim() : null);
  const userCity = body.city === undefined ? undefined : (body.city ? String(body.city).trim() : null);
  const preferredCountry = body.preferredCountry === undefined ? undefined : (body.preferredCountry ? String(body.preferredCountry).trim() : null);
  const programLevel = body.programLevel === undefined ? undefined : (body.programLevel ? String(body.programLevel).trim() : null);
  const courseField = body.courseField === undefined ? undefined : (body.courseField ? String(body.courseField).trim() : null);
  const intake = body.intake === undefined ? undefined : (body.intake ? String(body.intake).trim() : null);
  const budget = body.budget === undefined ? undefined : (body.budget ? String(body.budget).trim() : null);
  const sourceOfLead = body.sourceOfLead === undefined ? undefined : (body.sourceOfLead ? String(body.sourceOfLead).trim() : null);
  const conversationStatus = normalizeStatus(body.conversationStatus);
  const leadType = getLeadType(conversationStatus);
  const reminderDone = body.reminderDone ? 1 : 0;
  const actingAdminUserId =
    body.actingAdminUserId === undefined || body.actingAdminUserId === null ? null : Number(body.actingAdminUserId);
  const actingAdminRole = String(body.actingAdminRole || '').trim().toLowerCase();
  let reminderAt: string | null;
  let lastContactedAt: string | null;

  try {
    reminderAt = toMySqlDateTime(body.reminderAt);
    lastContactedAt = toMySqlDateTime(body.lastContactedAt);
  } catch {
    return res.status(400).json({ error: 'Invalid reminderAt or lastContactedAt datetime format' });
  }

  const [existingRows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.notes,
            DATE_FORMAT(lc.reminder_at, '%Y-%m-%d %H:%i:%s') AS reminderAt,
            lc.reminder_done AS reminderDone,
            DATE_FORMAT(lc.last_contacted_at, '%Y-%m-%d %H:%i:%s') AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            DATE_FORMAT(lc.assigned_at, '%Y-%m-%d %H:%i:%s') AS assignedAt,
            DATE_FORMAT(lc.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
            DATE_FORMAT(lc.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity,
            u.preferred_country AS userPreferredCountry,
            u.program_level AS userProgramLevel,
            u.course_field AS userCourseField,
            u.lead_intake AS userLeadIntake,
            u.budget AS userBudget,
            u.lead_from AS userLeadFrom
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  const existingConversation = existingRows[0];
  if (
    actingAdminRole === 'employee' &&
    actingAdminUserId &&
    existingConversation?.assignedEmployeeUserId &&
    Number(existingConversation.assignedEmployeeUserId) !== actingAdminUserId
  ) {
    return res.status(409).json({ error: `${existingConversation.assignedEmployeeName || 'Another employee'} already took this lead` });
  }

  if (userName !== undefined && !userName) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }

  if (userEmail !== undefined && userEmail) {
    const [emailRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [userEmail, userId]
    );
    if (emailRows.length) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
  }

  if (userPhone !== undefined && userPhone) {
    const [phoneRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1',
      [userPhone, userId]
    );
    if (phoneRows.length) {
      return res.status(409).json({ error: 'User with this phone already exists' });
    }
  }

  const userUpdates: string[] = [];
  const userValues: Array<string | null | number> = [];
  if (userName !== undefined) {
    userUpdates.push('name = ?');
    userValues.push(userName);
  }
  if (userEmail !== undefined) {
    userUpdates.push('email = ?');
    userValues.push(userEmail);
  }
  if (userPhone !== undefined) {
    userUpdates.push('phone = ?');
    userValues.push(userPhone);
  }
  if (userCity !== undefined) {
    userUpdates.push('city = ?');
    userValues.push(userCity);
  }
  if (preferredCountry !== undefined) {
    userUpdates.push('preferred_country = ?');
    userValues.push(preferredCountry);
  }
  if (programLevel !== undefined) {
    userUpdates.push('program_level = ?');
    userValues.push(programLevel);
  }
  if (courseField !== undefined) {
    userUpdates.push('course_field = ?');
    userValues.push(courseField);
  }
  if (intake !== undefined) {
    userUpdates.push('lead_intake = ?');
    userValues.push(intake);
  }
  if (budget !== undefined) {
    userUpdates.push('budget = ?');
    userValues.push(budget);
  }
  if (sourceOfLead !== undefined) {
    userUpdates.push('lead_from = ?');
    userValues.push(sourceOfLead);
  }

  if (userUpdates.length) {
    await pool.query<ResultSetHeader>(
      `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
      [...userValues, userId]
    );
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO lead_conversations
      (user_id, looking_for, conversation_status, lead_type, notes, reminder_at, reminder_done, last_contacted_at, assigned_employee_user_id, assigned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      looking_for = VALUES(looking_for),
      conversation_status = VALUES(conversation_status),
      lead_type = VALUES(lead_type),
      notes = VALUES(notes),
      reminder_at = VALUES(reminder_at),
      reminder_done = VALUES(reminder_done),
      last_contacted_at = VALUES(last_contacted_at),
      assigned_employee_user_id = COALESCE(lead_conversations.assigned_employee_user_id, VALUES(assigned_employee_user_id)),
      assigned_at = CASE
        WHEN lead_conversations.assigned_employee_user_id IS NULL AND VALUES(assigned_employee_user_id) IS NOT NULL
          THEN COALESCE(lead_conversations.assigned_at, VALUES(assigned_at))
        ELSE lead_conversations.assigned_at
      END,
      updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      lookingFor,
      conversationStatus,
      leadType,
      notes,
      reminderAt,
      reminderDone,
      lastContactedAt,
      actingAdminRole === 'employee' && actingAdminUserId ? actingAdminUserId : null,
      actingAdminRole === 'employee' && actingAdminUserId ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
    ]
  );

  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.lead_type AS leadType,
            lc.notes,
            lc.reminder_at AS reminderAt,
            lc.reminder_done AS reminderDone,
            lc.last_contacted_at AS lastContactedAt,
            lc.assigned_employee_user_id AS assignedEmployeeUserId,
            lc.assigned_at AS assignedAt,
            lc.created_at AS createdAt,
            lc.updated_at AS updatedAt,
            au.name AS assignedEmployeeName,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     LEFT JOIN users au ON au.id = lc.assigned_employee_user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return res.status(500).json({ error: 'Failed to save lead conversation' });
  }

  res.json(rowToConversation(rows[0]));
});

export default router;
