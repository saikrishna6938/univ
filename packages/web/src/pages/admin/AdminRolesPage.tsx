import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
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
  createAdminRole,
  deleteAdminRole,
  fetchAdminRoles,
  type AdminRole,
  updateAdminRole
} from '../../lib/api';
import './admin.css';

type RoleForm = {
  name: string;
  roleName: string;
  roleType: 'Manager' | 'Admin' | 'SuperAdmin' | 'Student' | 'Default' | 'Employee' | 'Entity';
  description: string;
  enabled: boolean;
};

const ROLE_TYPE_OPTIONS: Array<RoleForm['roleType']> = ['Manager', 'Admin', 'SuperAdmin', 'Student', 'Default', 'Employee', 'Entity'];

const EMPTY_FORM: RoleForm = {
  name: '',
  roleName: '',
  roleType: 'Default',
  description: '',
  enabled: true
};

export default function AdminRolesPage() {
  const [rows, setRows] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const roles = await fetchAdminRoles();
        if (!mounted) return;
        setRows(roles);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load roles');
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
      [row.name, row.roleName, row.description].some((value) => String(value || '').toLowerCase().includes(query))
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

  function openEdit(item: AdminRole) {
    setEditing(item);
    setForm({
      name: item.name || '',
      roleName: item.roleName || '',
      roleType: item.roleType || 'Default',
      description: item.description || '',
      enabled: item.enabled
    });
    setDialogOpen(true);
  }

  async function submit() {
    const name = form.name.trim();
    const roleName = form.roleName.trim().toLowerCase();
    if (!name || !roleName) {
      setError('Name and role name are required');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminRole(editing.id, {
          name,
          roleName,
          roleType: form.roleType,
          description: form.description.trim() || null,
          enabled: form.enabled
        });
        setRows((prev) => prev.map((row) => (row.id === editing.id ? updated : row)));
      } else {
        const created = await createAdminRole({
          name,
          roleName,
          roleType: form.roleType,
          description: form.description.trim() || null,
          enabled: form.enabled
        });
        setRows((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AdminRole) {
    const ok = window.confirm(`Delete role "${item.name}"?`);
    if (!ok) return;

    try {
      await deleteAdminRole(item.id);
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
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
            <AdminPanelSettingsRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Roles
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search role"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(0);
              }}
            />
            <Chip label={loading ? 'Loading...' : `${filteredRows.length} roles`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreate}>
              Create Role
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
                <TableCell>Name</TableCell>
                <TableCell>RoleName</TableCell>
                <TableCell>Role Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Enable</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`role-skeleton-${idx}`}>
                      <TableCell colSpan={6}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedRows.map((item) => (
                    <TableRow hover key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.roleName}</TableCell>
                      <TableCell>{item.roleType}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.enabled ? 'Enabled' : 'Disabled'}
                          color={item.enabled ? 'success' : 'default'}
                          variant={item.enabled ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit role">
                            <IconButton size="small" color="primary" onClick={() => openEdit(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete role">
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
        <DialogTitle>{editing ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="RoleName"
              value={form.roleName}
              onChange={(event) => setForm((prev) => ({ ...prev, roleName: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="role-type-label">Role Type</InputLabel>
              <Select
                labelId="role-type-label"
                label="Role Type"
                value={form.roleType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    roleType: event.target.value as RoleForm['roleType']
                  }))
                }
              >
                {ROLE_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                />
              }
              label="Enable"
            />
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
