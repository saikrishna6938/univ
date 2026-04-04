import GroupRounded from '@mui/icons-material/GroupRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import type { AdminListUser, AdminRole, Country } from '../../lib/api';
import { createAdminUser, deleteAdminUser, fetchAdminRoles, fetchAdminUsers, fetchCountries, updateAdminUser } from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  roles: string[];
  countryIds: number[];
  password: string;
};

const EMPTY_FORM: UserFormState = {
  name: '',
  email: '',
  phone: '',
  city: '',
  roles: [],
  countryIds: [],
  password: ''
};

function normalizePanelRoles(input: unknown, allowedRoles: Set<string>): string[] {
  const values = Array.isArray(input) ? input : [input];
  return [...new Set(
    values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value).trim().toLowerCase())
      .filter((value) => allowedRoles.has(value))
  )];
}

function splitSelectedRoles(selectedRoles: string[]) {
  const normalized = [...new Set(selectedRoles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean))];
  const panelRoles = normalized.filter((role) => role !== 'student' && role !== 'uploaded');
  const baseRole = normalized.find((role) => role === 'student' || role === 'uploaded') || undefined;
  return { panelRoles, baseRole };
}

export default function AdminUsersPage() {
  const { adminUser } = useAdminAuth();
  const isEmployeeSession = adminUser?.role === 'employee';
  const [users, setUsers] = useState<AdminListUser[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminListUser | null>(null);
  const [newUserForm, setNewUserForm] = useState<UserFormState>(EMPTY_FORM);
  const [editUserForm, setEditUserForm] = useState<UserFormState>(EMPTY_FORM);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const enabledRoleOptions = useMemo(() => roles.filter((role) => role.enabled), [roles]);
  const allowedRoleNames = useMemo(
    () => new Set(enabledRoleOptions.map((role) => String(role.roleName || '').toLowerCase())),
    [enabledRoleOptions]
  );

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const scopedViewerRoles =
          adminUser?.role === 'admin'
            ? undefined
            : (adminUser?.roles || [adminUser?.role || ''])
                .map((role) => String(role || '').trim().toLowerCase())
                .filter(Boolean);
        const [userRows, countryRows, roleRows] = await Promise.all([
          fetchAdminUsers('registered', { viewerRoles: scopedViewerRoles }),
          fetchCountries(),
          fetchAdminRoles()
        ]);
        if (!mounted) return;
        setUsers(userRows);
        setCountries(countryRows);
        setRoles(roleRows);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [adminUser?.role, adminUser?.roles]);

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const values = [user.name, user.phone, user.email, user.role, ...(user.roles || [])]
        .map((value) => String(value || '').toLowerCase());
      return values.some((value) => value.includes(query));
    });
  }, [searchText, users]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredUsers.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredUsers.length, page, rowsPerPage]);

  const pagedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  const canManageUsers = adminUser?.role === 'admin' || adminUser?.role === 'manager';
  const pagedUserIds = useMemo(() => pagedUsers.map((user) => user.id), [pagedUsers]);
  const selectedOnPageCount = useMemo(
    () => pagedUserIds.filter((id) => selectedUserIds.includes(id)).length,
    [pagedUserIds, selectedUserIds]
  );
  const allSelectedOnPage = pagedUserIds.length > 0 && selectedOnPageCount === pagedUserIds.length;
  const someSelectedOnPage = selectedOnPageCount > 0 && selectedOnPageCount < pagedUserIds.length;

  useEffect(() => {
    setSelectedUserIds((prev) => prev.filter((id) => filteredUsers.some((user) => user.id === id)));
  }, [filteredUsers]);

  function openUserEditor(user: AdminListUser) {
    setEditingUser(user);
    setEditUserForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      city: user.city || '',
      roles: [...new Set([String(user.role || '').toLowerCase(), ...normalizePanelRoles(user.roles || [], allowedRoleNames)].filter(Boolean))],
      countryIds: (user.countryIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
      password: ''
    });
  }

  async function addUser() {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      setError('Name and email are required');
      return;
    }

    setCreatingUser(true);
    try {
      const { panelRoles, baseRole } = splitSelectedRoles(newUserForm.roles);
      const created = await createAdminUser({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        phone: newUserForm.phone.trim() || undefined,
        city: newUserForm.city.trim() || undefined,
        role: isEmployeeSession ? 'student' : baseRole,
        roles: isEmployeeSession ? [] : panelRoles,
        countryIds: isEmployeeSession ? [] : newUserForm.countryIds,
        password: newUserForm.password.trim() || undefined
      });

      setUsers((prev) => [created, ...prev]);
      setNewUserForm(EMPTY_FORM);
      setIsAddUserOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setCreatingUser(false);
    }
  }

  async function saveUserEdit() {
    if (!editingUser) return;
    if (!editUserForm.name.trim() || !editUserForm.email.trim()) {
      setError('Name and email are required');
      return;
    }

    setUpdatingUser(true);
    try {
      const { panelRoles, baseRole } = splitSelectedRoles(editUserForm.roles);
      const updated = await updateAdminUser(editingUser.id, {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim(),
        phone: editUserForm.phone.trim() || undefined,
        city: editUserForm.city.trim() || undefined,
        role: baseRole,
        roles: panelRoles,
        countryIds: editUserForm.countryIds,
        password: editUserForm.password.trim() || undefined
      });

      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setEditingUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setUpdatingUser(false);
    }
  }

  async function removeUser(user: AdminListUser) {
    const ok = window.confirm(`Delete user "${user.name}"?`);
    if (!ok) return;

    setSaving(true);
    try {
      await deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  }

  async function removeSelectedUsers() {
    if (!selectedUserIds.length) return;
    const selectedIdsOnPage = pagedUserIds.filter((id) => selectedUserIds.includes(id));
    if (!selectedIdsOnPage.length) return;

    const ok = window.confirm(`Delete ${selectedIdsOnPage.length} selected user(s) from this page?`);
    if (!ok) return;

    setSaving(true);
    try {
      await Promise.all(selectedIdsOnPage.map((id) => deleteAdminUser(id)));
      setUsers((prev) => prev.filter((user) => !selectedIdsOnPage.includes(user.id)));
      setSelectedUserIds((prev) => prev.filter((id) => !selectedIdsOnPage.includes(id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete selected users');
    } finally {
      setSaving(false);
    }
  }

  function toggleUserSelection(userId: number) {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedUserIds((prev) => {
      const offPageIds = prev.filter((id) => !pagedUserIds.includes(id));
      return checked ? [...offPageIds, ...pagedUserIds] : offPageIds;
    });
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
            <GroupRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Users
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              id="user-grid-filter"
              name="user_grid_filter"
              size="small"
              placeholder="Filter by name, email, phone, or role"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(0);
              }}
              autoComplete="new-password"
              inputProps={{ autoComplete: 'new-password' }}
            />
            <Chip label={loading ? 'Loading...' : `${filteredUsers.length} users`} color="info" variant="outlined" />
            {canManageUsers ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={removeSelectedUsers}
                disabled={saving || selectedOnPageCount === 0}
              >
                Delete Selected
              </Button>
            ) : null}
            <Button size="small" variant="contained" onClick={() => setIsAddUserOpen(true)}>
              Add User
            </Button>
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={960}
            tableLayout="auto"
            headerSx={{
              '& .MuiTableCell-root': {
                whiteSpace: 'nowrap',
                fontSize: '0.78rem'
              }
            }}
            maxBodyHeight={{
              xs: 'calc(100vh - 350px)',
              md: 'calc(100vh - 330px)'
            }}
            minBodyHeight={{
              xs: 'calc(100vh - 430px)',
              md: 'calc(100vh - 390px)'
            }}
            headerRow={
              <TableRow>
                {canManageUsers ? (
                  <TableCell padding="checkbox" sx={{ width: 52, minWidth: 52 }}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      indeterminate={someSelectedOnPage}
                      onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                      inputProps={{ 'aria-label': 'Select all users on current page' }}
                    />
                  </TableCell>
                ) : null}
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow key={`user-skeleton-${idx}`}>
                      <TableCell colSpan={canManageUsers ? 6 : 5}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedUsers.map((user) => (
                    <TableRow hover key={user.id}>
                      {canManageUsers ? (
                        <TableCell padding="checkbox" sx={{ width: 52, minWidth: 52 }}>
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            inputProps={{ 'aria-label': `Select ${user.name}` }}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {user.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.roles && user.roles.length ? user.roles.join(', ') : user.role}</TableCell>
                      <TableCell align="right">
                        {canManageUsers ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Edit user">
                              <IconButton size="small" color="primary" onClick={() => openUserEditor(user)}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete user">
                              <span>
                                <IconButton size="small" color="error" onClick={() => removeUser(user)} disabled={saving}>
                                  <DeleteOutlineRounded fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
            }
          />
          {!loading ? (
            <TablePagination
              component="div"
              count={filteredUsers.length}
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

      <Dialog fullWidth maxWidth="sm" open={isAddUserOpen} onClose={() => setIsAddUserOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="new-user-name" name="new_user_name" label="Name" value={newUserForm.name} onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))} fullWidth autoComplete="section-new-user name" />
            <TextField id="new-user-email" name="new_user_email" label="Email" type="email" value={newUserForm.email} onChange={(event) => setNewUserForm((prev) => ({ ...prev, email: event.target.value }))} fullWidth autoComplete="section-new-user email" />
            <TextField id="new-user-phone" name="new_user_phone" label="Phone" value={newUserForm.phone} onChange={(event) => setNewUserForm((prev) => ({ ...prev, phone: event.target.value }))} fullWidth autoComplete="section-new-user tel" />
            <TextField id="new-user-city" name="new_user_city" label="City" value={newUserForm.city} onChange={(event) => setNewUserForm((prev) => ({ ...prev, city: event.target.value }))} fullWidth autoComplete="section-new-user address-level2" />
            <FormControl fullWidth>
              {isEmployeeSession ? (
                <TextField label="Role" value="student" fullWidth InputProps={{ readOnly: true }} />
              ) : (
                <>
                  <InputLabel id="new-user-role-label">Roles</InputLabel>
                  <Select
                    labelId="new-user-role-label"
                    label="Roles"
                    multiple
                    value={newUserForm.roles}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                    onChange={(event) =>
                      setNewUserForm((prev) => ({
                        ...prev,
                        roles: normalizePanelRoles(event.target.value, allowedRoleNames)
                      }))
                    }
                  >
                    {enabledRoleOptions.map((role) => (
                      <MenuItem key={role.id} value={role.roleName}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              )}
            </FormControl>
            {!isEmployeeSession ? (
              <FormControl fullWidth>
                <InputLabel id="new-user-country-label">Countries</InputLabel>
                <Select
                  labelId="new-user-country-label"
                  label="Countries"
                  multiple
                  value={newUserForm.countryIds}
                  renderValue={(selected) =>
                    (selected as number[])
                      .map((id) => countries.find((country) => Number(country.id ?? country._id ?? 0) === id)?.name || id)
                      .join(', ')
                  }
                  onChange={(event) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      countryIds: (event.target.value as number[]).map((id) => Number(id))
                    }))
                  }
                >
                  {countries.map((country) => {
                    const id = Number(country.id ?? country._id ?? 0);
                    return (
                      <MenuItem key={id} value={id}>
                        {country.name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            ) : null}
            <TextField
              label="Password"
              type="password"
              helperText={newUserForm.roles.length > 0 ? 'Required (min 6 chars) for admin-panel roles' : 'Optional for students'}
              value={newUserForm.password}
              onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddUserOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={addUser} variant="contained" disabled={creatingUser}>
            {creatingUser ? 'Adding...' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" open={Boolean(editingUser)} onClose={() => setEditingUser(null)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="edit-user-name" name="edit_user_name" label="Name" value={editUserForm.name} onChange={(event) => setEditUserForm((prev) => ({ ...prev, name: event.target.value }))} fullWidth autoComplete="section-edit-user name" />
            <TextField id="edit-user-email" name="edit_user_email" label="Email" type="email" value={editUserForm.email} onChange={(event) => setEditUserForm((prev) => ({ ...prev, email: event.target.value }))} fullWidth autoComplete="section-edit-user email" />
            <TextField id="edit-user-phone" name="edit_user_phone" label="Phone" value={editUserForm.phone} onChange={(event) => setEditUserForm((prev) => ({ ...prev, phone: event.target.value }))} fullWidth autoComplete="section-edit-user tel" />
            <TextField id="edit-user-city" name="edit_user_city" label="City" value={editUserForm.city} onChange={(event) => setEditUserForm((prev) => ({ ...prev, city: event.target.value }))} fullWidth autoComplete="section-edit-user address-level2" />
            <FormControl fullWidth>
              <InputLabel id="edit-user-role-label">Roles</InputLabel>
              <Select
                labelId="edit-user-role-label"
                label="Roles"
                multiple
                value={editUserForm.roles}
                renderValue={(selected) => (selected as string[]).join(', ')}
                onChange={(event) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    roles: normalizePanelRoles(event.target.value, allowedRoleNames)
                  }))
                }
              >
                {enabledRoleOptions.map((role) => (
                  <MenuItem key={role.id} value={role.roleName}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="edit-user-country-label">Countries</InputLabel>
              <Select
                labelId="edit-user-country-label"
                label="Countries"
                multiple
                value={editUserForm.countryIds}
                renderValue={(selected) =>
                  (selected as number[])
                    .map((id) => countries.find((country) => Number(country.id ?? country._id ?? 0) === id)?.name || id)
                    .join(', ')
                }
                onChange={(event) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    countryIds: (event.target.value as number[]).map((id) => Number(id))
                  }))
                }
              >
                {countries.map((country) => {
                  const id = Number(country.id ?? country._id ?? 0);
                  return (
                    <MenuItem key={id} value={id}>
                      {country.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <TextField
              label="Password (optional reset)"
              type="password"
              helperText="Leave blank to keep current password"
              value={editUserForm.password}
              onChange={(event) => setEditUserForm((prev) => ({ ...prev, password: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={saveUserEdit} variant="contained" disabled={updatingUser}>
            {updatingUser ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
