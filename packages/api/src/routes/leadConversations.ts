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
  'Call Not Answered',
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
  'Call Not Answered',
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
          city: row.userCity
        }
      : undefined
  };
}

router.get('/', async (_req, res) => {
  await ensureLeadConversationSchema();
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

  const existingConversation = existingRows[0];
  if (
    actingAdminRole === 'employee' &&
    actingAdminUserId &&
    existingConversation?.assignedEmployeeUserId &&
    Number(existingConversation.assignedEmployeeUserId) !== actingAdminUserId
  ) {
    return res.status(409).json({ error: `${existingConversation.assignedEmployeeName || 'Another employee'} already took this lead` });
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
