import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { ensureAdminRolesTable } from './adminRoles';

const router = Router();
let ensureEntitiesPromise: Promise<void> | null = null;

export async function ensureEntitiesTable() {
  if (!ensureEntitiesPromise) {
    ensureEntitiesPromise = (async () => {
      await ensureAdminRolesTable();
      await pool.query(
        `CREATE TABLE IF NOT EXISTS entities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          entity_name VARCHAR(255) NOT NULL,
          entity_description TEXT NULL,
          entity_role_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_entities_role_id (entity_role_id),
          CONSTRAINT fk_entities_admin_role
            FOREIGN KEY (entity_role_id) REFERENCES admin_roles(id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        )`
      );
    })().catch((err) => {
      ensureEntitiesPromise = null;
      throw err;
    });
  }

  await ensureEntitiesPromise;
}

async function fetchEntityRole(roleId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, role_name AS roleName, role_type AS roleType, enabled
     FROM admin_roles
     WHERE id = ?
     LIMIT 1`,
    [roleId]
  );
  return rows[0] || null;
}

function mapEntityRow(row: RowDataPacket) {
  return {
    id: Number(row.id),
    entityName: String(row.entityName || ''),
    entityDescription: row.entityDescription ? String(row.entityDescription) : null,
    entityRoleId: Number(row.entityRoleId),
    entityRoleName: String(row.entityRoleName || ''),
    entityRoleLabel: String(row.entityRoleLabel || ''),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

router.get('/', async (_req, res) => {
  await ensureEntitiesTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.entity_name AS entityName,
            e.entity_description AS entityDescription,
            e.entity_role_id AS entityRoleId,
            ar.role_name AS entityRoleName,
            ar.name AS entityRoleLabel,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM entities e
     INNER JOIN admin_roles ar ON ar.id = e.entity_role_id
     ORDER BY e.updated_at DESC, e.id DESC`
  );

  res.json(rows.map(mapEntityRow));
});

router.post('/', async (req, res) => {
  await ensureEntitiesTable();
  const entityName = String(req.body?.entityName || '').trim();
  const entityDescription = req.body?.entityDescription ? String(req.body.entityDescription).trim() : null;
  const entityRoleId = Number(req.body?.entityRoleId);

  if (!entityName || !entityRoleId || Number.isNaN(entityRoleId)) {
    return res.status(400).json({ error: 'entityName and entityRoleId are required' });
  }

  const role = await fetchEntityRole(entityRoleId);
  if (!role || String(role.roleType || '') !== 'Entity') {
    return res.status(400).json({ error: 'Entity role must reference an admin role with roleType "Entity"' });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO entities (entity_name, entity_description, entity_role_id)
     VALUES (?, ?, ?)`,
    [entityName, entityDescription, entityRoleId]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.entity_name AS entityName,
            e.entity_description AS entityDescription,
            e.entity_role_id AS entityRoleId,
            ar.role_name AS entityRoleName,
            ar.name AS entityRoleLabel,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM entities e
     INNER JOIN admin_roles ar ON ar.id = e.entity_role_id
     WHERE e.id = ?
     LIMIT 1`,
    [(result as ResultSetHeader).insertId]
  );

  res.status(201).json(mapEntityRow(rows[0]));
});

router.patch('/:id', async (req, res) => {
  await ensureEntitiesTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid entity id is required' });
  }

  const updates: string[] = [];
  const values: Array<string | number | null> = [];

  if (req.body?.entityName !== undefined) {
    const entityName = String(req.body.entityName || '').trim();
    if (!entityName) return res.status(400).json({ error: 'entityName cannot be empty' });
    updates.push('entity_name = ?');
    values.push(entityName);
  }

  if (req.body?.entityDescription !== undefined) {
    updates.push('entity_description = ?');
    values.push(req.body.entityDescription ? String(req.body.entityDescription).trim() : null);
  }

  if (req.body?.entityRoleId !== undefined) {
    const entityRoleId = Number(req.body.entityRoleId);
    if (!entityRoleId || Number.isNaN(entityRoleId)) {
      return res.status(400).json({ error: 'Valid entityRoleId is required' });
    }
    const role = await fetchEntityRole(entityRoleId);
    if (!role || String(role.roleType || '') !== 'Entity') {
      return res.status(400).json({ error: 'Entity role must reference an admin role with roleType "Entity"' });
    }
    updates.push('entity_role_id = ?');
    values.push(entityRoleId);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  const [result] = await pool.query<ResultSetHeader>(`UPDATE entities SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id,
            e.entity_name AS entityName,
            e.entity_description AS entityDescription,
            e.entity_role_id AS entityRoleId,
            ar.role_name AS entityRoleName,
            ar.name AS entityRoleLabel,
            e.created_at AS createdAt,
            e.updated_at AS updatedAt
     FROM entities e
     INNER JOIN admin_roles ar ON ar.id = e.entity_role_id
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );

  res.json(mapEntityRow(rows[0]));
});

router.delete('/:id', async (req, res) => {
  await ensureEntitiesTable();
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Valid entity id is required' });
  }

  const [result] = await pool.query<ResultSetHeader>('DELETE FROM entities WHERE id = ?', [id]);
  if ((result as ResultSetHeader).affectedRows === 0) {
    return res.status(404).json({ error: 'Entity not found' });
  }

  res.json({ success: true });
});

export default router;
