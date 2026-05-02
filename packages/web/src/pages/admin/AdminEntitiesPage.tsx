import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TableCell,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import AdminDataTable from '../../components/admin/AdminDataTable';
import {
  createAdminEntity,
  deleteAdminEntity,
  fetchAdminEntities,
  fetchAdminRoles,
  type AdminEntity,
  type AdminRole,
  updateAdminEntity
} from '../../lib/api';
import './admin.css';

type EntityForm = {
  entityName: string;
  entityDescription: string;
  entityRoleId: number | '';
};

const EMPTY_FORM: EntityForm = {
  entityName: '',
  entityDescription: '',
  entityRoleId: ''
};

export default function AdminEntitiesPage() {
  const [rows, setRows] = useState<AdminEntity[]>([]);
  const [entityRoles, setEntityRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEntity | null>(null);
  const [form, setForm] = useState<EntityForm>(EMPTY_FORM);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [entities, roles] = await Promise.all([fetchAdminEntities(), fetchAdminRoles()]);
        if (!mounted) return;
        setRows(entities);
        setEntityRoles(roles.filter((role) => role.enabled && role.roleType === 'Entity'));
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load entities');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.entityName, row.entityDescription, row.entityRoleLabel, row.entityRoleName].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [rows, searchText]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredRows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredRows.length, page, rowsPerPage]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(item: AdminEntity) {
    setEditing(item);
    setForm({
      entityName: item.entityName || '',
      entityDescription: item.entityDescription || '',
      entityRoleId: item.entityRoleId || ''
    });
    setDialogOpen(true);
  }

  async function submit() {
    const entityName = form.entityName.trim();
    const entityRoleId = Number(form.entityRoleId);
    if (!entityName || !entityRoleId || Number.isNaN(entityRoleId)) {
      setError('Entity name and entity role are required');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminEntity(editing.id, {
          entityName,
          entityDescription: form.entityDescription.trim() || null,
          entityRoleId
        });
        setRows((prev) => prev.map((row) => (row.id === editing.id ? updated : row)));
      } else {
        const created = await createAdminEntity({
          entityName,
          entityDescription: form.entityDescription.trim() || null,
          entityRoleId
        });
        setRows((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entity');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AdminEntity) {
    const ok = window.confirm(`Delete entity "${item.entityName}"?`);
    if (!ok) return;

    try {
      await deleteAdminEntity(item.id);
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entity');
    }
  }

  return (
    <Box className="admin-dashboard">
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box className="admin-panel">
        <Box className="admin-panel__head">
          <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <AccountTreeRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Entities
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search entity"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(0);
              }}
            />
            <Chip label={loading ? 'Loading...' : `${filteredRows.length} entities`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreate}>
              Create Entity
            </Button>
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={920}
            tableLayout="auto"
            maxBodyHeight={{
              xs: 'calc(100vh - 360px)',
              md: 'calc(100vh - 330px)'
            }}
            minBodyHeight={{
              xs: 'calc(100vh - 460px)',
              md: 'calc(100vh - 410px)'
            }}
            headerRow={
              <TableRow>
                <TableCell>Entity Name</TableCell>
                <TableCell>Entity Description</TableCell>
                <TableCell>Entity Role</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`entity-skeleton-${idx}`}>
                      <TableCell colSpan={4}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedRows.map((item) => (
                    <TableRow hover key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {item.entityName}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.entityDescription || '-'}</TableCell>
                      <TableCell>{item.entityRoleLabel || item.entityRoleName}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit entity">
                            <IconButton size="small" color="primary" onClick={() => openEdit(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete entity">
                            <IconButton size="small" color="error" onClick={() => remove(item)}>
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
            }
          />
          {!loading ? (
            <TablePagination
              component="div"
              count={filteredRows.length}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          ) : null}
        </Box>
      </Box>

      <Dialog fullWidth maxWidth="sm" open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editing ? 'Edit Entity' : 'Create Entity'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Entity Name"
              value={form.entityName}
              onChange={(event) => setForm((prev) => ({ ...prev, entityName: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Entity Description"
              value={form.entityDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, entityDescription: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="entity-role-label">Entity Role</InputLabel>
              <Select
                labelId="entity-role-label"
                label="Entity Role"
                value={form.entityRoleId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    entityRoleId: Number(event.target.value)
                  }))
                }
              >
                {entityRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={submit} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
