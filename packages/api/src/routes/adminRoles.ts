import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();
let ensureAdminRolesPromise: Promise<void> | null = null;
export const ROLE_TYPE_OPTIONS = ['Manager', 'Admin', 'SuperAdmin', 'Student', 'Default', 'Employee', 'Entity'] as const;
type RoleTypeName = (typeof ROLE_TYPE_OPTIONS)[number];

function normalizeRoleType(value: unknown): RoleTypeName {
  const input = String(value || '').trim();
  return ROLE_TYPE_OPTIONS.find((item) => item === input) || 'Default';
}

export async function ensureAdminRolesTable() {
  if (!ensureAdminRolesPromise) {
    ensureAdminRolesPromise = (async () => {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS admin_roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          role_name VARCHAR(120) NOT NULL UNIQUE,
          role_type VARCHAR(40) NOT NULL DEFAULT 'Default',
          description TEXT NULL,
          enabled TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_admin_roles_enabled (enabled)
        )`
      );

      const [roleTypeColumn] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM admin_roles LIKE 'role_type'`
      );
      if (!roleTypeColumn.length) {
        await pool.query(`ALTER TABLE admin_roles ADD COLUMN role_type VARCHAR(40) NOT NULL DEFAULT 'Default' AFTER role_name`);
      }

      await pool.query(
        `INSERT INTO admin_roles (name, role_name, role_type, description, enabled)
         VALUES
           ('Admin', 'admin', 'Admin', 'Full access to admin operations.', 1),
           ('Manager', 'manager', 'Manager', 'Operational access for management workflows.', 1),
           ('Employee', 'employee', 'Employee', 'Execution access for assigned operational work.', 1),
           ('Student', 'student', 'Student', 'Registered student user role.', 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           role_type = VALUES(role_type),
           description = VALUES(description),
           enabled = VALUES(enabled)`
      );
    })().catch((err) => {
      ensureAdminRolesPromise = null;
      throw err;
    });
  }

  await ensureAdminRolesPromise;
}

function mapRoleRow(row: RowDataPacket) {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    roleName: String(row.roleName || ''),
    roleType: normalizeRoleType(row.roleType),
    description: row.description ? String(row.description) : null,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

router.get('/', async (_req, res) => {
  await ensureAdminRolesTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,
            name,
            role_name AS roleName,
            role_type AS roleType,
            description,
            enabled,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM admin_roles
     ORDER BY updated_at DESC, id DESC`
  );

  res.json(rows.map(mapRoleRow));
});

router.post('/', async (req, res) => {
  await ensureAdminRolesTable();
  const name = String(req.body?.name || '').trim();
  const roleName = String(req.body?.roleName || '').trim().toLowerCase();
  const roleType = normalizeRoleType(req.body?.roleType);
  const description = req.body?.description ? String(req.body.description).trim() : null;
  const enabled = req.body?.enabled === undefined ? 1 : req.body.enabled ? 1 : 0;

  if (!name || !roleName) {
    return res.status(400).json({ error: 'name and roleName are required' });
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE role_name = ? LIMIT 1',
    [roleName]
  );
  if (existing.length) {
    return res.status(409).json({ error: 'Role name already exists' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO admin_roles (name, role_name, role_type, description, enabled)
     VALUES (?, ?, ?, ?, ?)`,
    [name, roleName, roleType, description, enabled]
  );

  const id = (result as ResultSetHeader).insertId;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,
            name,
            role_name AS roleName,
            role_type AS roleType,
            description,
            enabled,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM admin_roles
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  res.status(201).json(mapRoleRow(rows[0]));
});

router.patch('/:id', async (req, res) => {
  await ensureAdminRolesTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid role id is required' });
  }

  const updates: string[] = [];
  const values: Array<string | number | null> = [];

  if (req.body?.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name cannot be empty' });
    updates.push('name = ?');
    values.push(name);
  }

  if (req.body?.roleName !== undefined) {
    const roleName = String(req.body.roleName || '').trim().toLowerCase();
    if (!roleName) return res.status(400).json({ error: 'roleName cannot be empty' });

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM admin_roles WHERE role_name = ? AND id <> ? LIMIT 1',
      [roleName, id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Role name already exists' });
    }

    updates.push('role_name = ?');
    values.push(roleName);
  }

  if (req.body?.roleType !== undefined) {
    updates.push('role_type = ?');
    values.push(normalizeRoleType(req.body.roleType));
  }

  if (req.body?.description !== undefined) {
    updates.push('description = ?');
    values.push(req.body.description ? String(req.body.description).trim() : null);
  }

  if (req.body?.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(req.body.enabled ? 1 : 0);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  await pool.query<ResultSetHeader>(`UPDATE admin_roles SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,
            name,
            role_name AS roleName,
            role_type AS roleType,
            description,
            enabled,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM admin_roles
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Role not found' });
  }

  res.json(mapRoleRow(rows[0]));
});

router.delete('/:id', async (req, res) => {
  await ensureAdminRolesTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid role id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM admin_roles WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Role not found' });
  }

  res.json({ success: true });
});

export default router;
