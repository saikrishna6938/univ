import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();

const ALLOWED_STATUSES = ['new', 'contacted', 'follow_up', 'interested', 'not_interested', 'closed'] as const;
type ConversationStatus = (typeof ALLOWED_STATUSES)[number];

type LeadConversationRow = RowDataPacket & {
  id: number;
  userId: number;
  lookingFor: string | null;
  conversationStatus: ConversationStatus;
  notes: string | null;
  reminderAt: string | null;
  reminderDone: number;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userCity?: string;
};

function normalizeStatus(value: unknown): ConversationStatus {
  const input = String(value || '').trim().toLowerCase();
  if (ALLOWED_STATUSES.includes(input as ConversationStatus)) {
    return input as ConversationStatus;
  }
  return 'new';
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
    notes: row.notes,
    reminderAt: row.reminderAt,
    reminderDone: Boolean(row.reminderDone),
    lastContactedAt: row.lastContactedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.notes,
            lc.reminder_at AS reminderAt,
            lc.reminder_done AS reminderDone,
            lc.last_contacted_at AS lastContactedAt,
            lc.created_at AS createdAt,
            lc.updated_at AS updatedAt,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     ORDER BY lc.updated_at DESC`
  );

  res.json(rows.map(rowToConversation));
});

router.get('/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.notes,
            lc.reminder_at AS reminderAt,
            lc.reminder_done AS reminderDone,
            lc.last_contacted_at AS lastContactedAt,
            lc.created_at AS createdAt,
            lc.updated_at AS updatedAt,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
     WHERE lc.user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Lead conversation not found' });
  }

  res.json(rowToConversation(rows[0]));
});

router.put('/:userId', async (req, res) => {
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
  const reminderDone = body.reminderDone ? 1 : 0;
  let reminderAt: string | null;
  let lastContactedAt: string | null;

  try {
    reminderAt = toMySqlDateTime(body.reminderAt);
    lastContactedAt = toMySqlDateTime(body.lastContactedAt);
  } catch {
    return res.status(400).json({ error: 'Invalid reminderAt or lastContactedAt datetime format' });
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO lead_conversations
      (user_id, looking_for, conversation_status, notes, reminder_at, reminder_done, last_contacted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      looking_for = VALUES(looking_for),
      conversation_status = VALUES(conversation_status),
      notes = VALUES(notes),
      reminder_at = VALUES(reminder_at),
      reminder_done = VALUES(reminder_done),
      last_contacted_at = VALUES(last_contacted_at),
      updated_at = CURRENT_TIMESTAMP`,
    [userId, lookingFor, conversationStatus, notes, reminderAt, reminderDone, lastContactedAt]
  );

  const [rows] = await pool.query<LeadConversationRow[]>(
    `SELECT lc.id,
            lc.user_id AS userId,
            lc.looking_for AS lookingFor,
            lc.conversation_status AS conversationStatus,
            lc.notes,
            lc.reminder_at AS reminderAt,
            lc.reminder_done AS reminderDone,
            lc.last_contacted_at AS lastContactedAt,
            lc.created_at AS createdAt,
            lc.updated_at AS updatedAt,
            u.name AS userName,
            u.email AS userEmail,
            u.phone AS userPhone,
            u.city AS userCity
     FROM lead_conversations lc
     INNER JOIN users u ON u.id = lc.user_id
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
