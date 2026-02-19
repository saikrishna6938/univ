import GroupRounded from '@mui/icons-material/GroupRounded';
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
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { AdminListUser, Country, LeadConversation, LeadConversationStatus } from '../../lib/api';
import { createAdminUser, fetchAdminUsers, fetchCountries, fetchLeadConversations, upsertLeadConversation } from '../../lib/api';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

type SortField =
  | 'name'
  | 'email'
  | 'phone'
  | 'city'
  | 'role'
  | 'lookingFor'
  | 'conversationStatus'
  | 'reminderAt'
  | 'createdAt'
  | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';
type SortState = {
  field: SortField;
  direction: SortDirection;
};

type ConversationForm = {
  lookingFor: string;
  conversationStatus: LeadConversationStatus;
  notes: string;
  reminderAt: string;
  reminderDone: boolean;
  lastContactedAt: string;
};

const STATUS_OPTIONS: Array<{ value: LeadConversationStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'closed', label: 'Closed' }
];

function toInputDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function AdminUsersPage() {
  const { adminUser } = useAdminAuth();
  const [users, setUsers] = useState<AdminListUser[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [conversationsByUserId, setConversationsByUserId] = useState<Record<number, LeadConversation>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', direction: 'desc' });

  const [editingUser, setEditingUser] = useState<AdminListUser | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    roles: [] as Array<'admin' | 'manager' | 'employee'>,
    countryIds: [] as number[],
    password: ''
  });
  const [form, setForm] = useState<ConversationForm>({
    lookingFor: '',
    conversationStatus: 'new',
    notes: '',
    reminderAt: '',
    reminderDone: false,
    lastContactedAt: ''
  });

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setLoading(true);
      try {
        const [rows, conversations, countryRows] = await Promise.all([
          fetchAdminUsers(),
          fetchLeadConversations(),
          fetchCountries()
        ]);
        if (!mounted) return;

        setUsers(rows);
        setCountries(countryRows);
        const map: Record<number, LeadConversation> = {};
        conversations.forEach((conversation) => {
          map[conversation.userId] = conversation;
        });
        setConversationsByUserId(map);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  function getComparableValue(user: AdminListUser, field: SortField): string | number | null {
    const conversation = conversationsByUserId[user.id];

    if (field === 'createdAt') return new Date(user.createdAt).getTime();
    if (field === 'lastLoginAt') return user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : null;
    if (field === 'reminderAt') return conversation?.reminderAt ? new Date(conversation.reminderAt).getTime() : null;
    if (field === 'lookingFor') return conversation?.lookingFor ? String(conversation.lookingFor).toLowerCase() : null;
    if (field === 'conversationStatus')
      return conversation?.conversationStatus ? String(conversation.conversationStatus).toLowerCase() : null;
    if (field === 'role') return user.roles && user.roles.length ? user.roles.join(',') : user.role;

    const value = user[field];
    if (value === undefined || value === null || value === '') return null;
    return String(value).toLowerCase();
  }

  function handleSort(field: SortField) {
    setSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  }

  const sortedUsers = useMemo(() => {
    const direction = sort.direction === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

    return [...users].sort((a, b) => {
      const aValue = getComparableValue(a, sort.field);
      const bValue = getComparableValue(b, sort.field);

      if (aValue === null && bValue === null) return a.id - b.id;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return a.id - b.id;
      }

      const textCompare = collator.compare(String(aValue), String(bValue));
      if (textCompare !== 0) return textCompare * direction;
      return 0;
    });
  }, [users, sort, conversationsByUserId]);

  const visibleUsers = useMemo(() => {
    const sessionRole = String(adminUser?.role || '').toLowerCase();

    if (sessionRole === 'employee') {
      return sortedUsers.filter((user) => String(user.role || '').toLowerCase() === 'student');
    }

    if (sessionRole === 'manager') {
      return sortedUsers.filter((user) => {
        const role = String(user.role || '').toLowerCase();
        return role === 'student' || role === 'employee';
      });
    }

    return sortedUsers;
  }, [adminUser?.role, sortedUsers]);

  function renderSortHeader(field: SortField, label: string) {
    return (
      <TableSortLabel
        active={sort.field === field}
        direction={sort.field === field ? sort.direction : 'asc'}
        onClick={() => handleSort(field)}
      >
        {label}
      </TableSortLabel>
    );
  }

  function openConversationEditor(user: AdminListUser) {
    const conversation = conversationsByUserId[user.id];
    setEditingUser(user);
    setForm({
      lookingFor: conversation?.lookingFor || '',
      conversationStatus: conversation?.conversationStatus || 'new',
      notes: conversation?.notes || '',
      reminderAt: toInputDateTime(conversation?.reminderAt),
      reminderDone: conversation?.reminderDone || false,
      lastContactedAt: toInputDateTime(conversation?.lastContactedAt)
    });
  }

  async function saveConversation() {
    if (!editingUser) return;

    setSaving(true);
    try {
      const saved = await upsertLeadConversation(editingUser.id, {
        lookingFor: form.lookingFor.trim() || null,
        conversationStatus: form.conversationStatus,
        notes: form.notes.trim() || null,
        reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : null,
        reminderDone: form.reminderDone,
        lastContactedAt: form.lastContactedAt ? new Date(form.lastContactedAt).toISOString() : null
      });

      setConversationsByUserId((prev) => ({
        ...prev,
        [saved.userId]: saved
      }));
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversation');
    } finally {
      setSaving(false);
    }
  }

  async function addUser() {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      setError('Name and email are required');
      return;
    }

    setCreatingUser(true);
    try {
      const created = await createAdminUser({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        phone: newUserForm.phone.trim() || undefined,
        city: newUserForm.city.trim() || undefined,
        roles: newUserForm.roles,
        countryIds: newUserForm.countryIds,
        password: newUserForm.password || undefined
      });

      setUsers((prev) => [created, ...prev]);
      setIsAddUserOpen(false);
      setNewUserForm({ name: '', email: '', phone: '', city: '', roles: [], countryIds: [], password: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setCreatingUser(false);
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
            <GroupRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Users
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={loading ? 'Loading...' : `${visibleUsers.length} users`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={() => setIsAddUserOpen(true)}>
              Add User
            </Button>
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          <TableContainer sx={{ maxHeight: 700 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{renderSortHeader('name', 'Name')}</TableCell>
                  <TableCell>{renderSortHeader('email', 'Email')}</TableCell>
                  <TableCell>{renderSortHeader('phone', 'Phone')}</TableCell>
                  <TableCell>{renderSortHeader('city', 'City')}</TableCell>
                  <TableCell>{renderSortHeader('role', 'Roles')}</TableCell>
                  <TableCell>{renderSortHeader('lookingFor', 'Looking For')}</TableCell>
                  <TableCell>{renderSortHeader('conversationStatus', 'Status')}</TableCell>
                  <TableCell>{renderSortHeader('reminderAt', 'Reminder')}</TableCell>
                  <TableCell>{renderSortHeader('createdAt', 'Created')}</TableCell>
                  <TableCell>{renderSortHeader('lastLoginAt', 'Last Login')}</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 10 }).map((_, idx) => (
                      <TableRow key={`user-skeleton-${idx}`}>
                        <TableCell colSpan={11}>
                          <Skeleton height={30} />
                        </TableCell>
                      </TableRow>
                    ))
                  : visibleUsers.map((user) => {
                      const conversation = conversationsByUserId[user.id];
                      return (
                        <TableRow hover key={user.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {user.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>{user.phone || '-'}</TableCell>
                          <TableCell>{user.city || '-'}</TableCell>
                          <TableCell>{user.roles && user.roles.length ? user.roles.join(', ') : user.role}</TableCell>
                          <TableCell>{conversation?.lookingFor || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={conversation?.conversationStatus || 'new'}
                              variant="outlined"
                              color={conversation?.conversationStatus === 'interested' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{conversation?.reminderAt ? new Date(conversation.reminderAt).toLocaleString() : '-'}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => openConversationEditor(user)}>
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      <Dialog fullWidth maxWidth="md" open={Boolean(editingUser)} onClose={() => setEditingUser(null)}>
        <DialogTitle>Lead Conversation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {editingUser ? `Student: ${editingUser.name} (${editingUser.email || editingUser.phone || 'No contact'})` : ''}
            </Typography>

            <TextField
              label="What are they looking for?"
              value={form.lookingFor}
              onChange={(event) => setForm((prev) => ({ ...prev, lookingFor: event.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="conversation-status-label">Conversation Status</InputLabel>
              <Select
                labelId="conversation-status-label"
                value={form.conversationStatus}
                label="Conversation Status"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, conversationStatus: event.target.value as LeadConversationStatus }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Conversation notes"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Reminder"
                type="datetime-local"
                value={form.reminderAt}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderAt: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Last contacted"
                type="datetime-local"
                value={form.lastContactedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, lastContactedAt: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="reminder-done-label">Reminder Status</InputLabel>
              <Select
                labelId="reminder-done-label"
                label="Reminder Status"
                value={form.reminderDone ? 'done' : 'pending'}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderDone: event.target.value === 'done' }))}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="done">Done</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={saveConversation} disabled={saving || !editingUser}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" open={isAddUserOpen} onClose={() => setIsAddUserOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={newUserForm.name}
              onChange={(event) => setNewUserForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={newUserForm.email}
              onChange={(event) => setNewUserForm((prev) => ({ ...prev, email: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              value={newUserForm.phone}
              onChange={(event) => setNewUserForm((prev) => ({ ...prev, phone: event.target.value }))}
              fullWidth
            />
            <TextField
              label="City"
              value={newUserForm.city}
              onChange={(event) => setNewUserForm((prev) => ({ ...prev, city: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="new-user-role-label">Roles</InputLabel>
              <Select
                labelId="new-user-role-label"
                label="Roles"
                multiple
                value={newUserForm.roles}
                renderValue={(selected) => (selected as string[]).join(', ')}
                onChange={(event) => {
                  const value = event.target.value;
                  const roles = Array.isArray(value) ? value : String(value).split(',');
                  const normalized = roles
                    .map((role) => String(role).trim().toLowerCase())
                    .filter((role): role is 'admin' | 'manager' | 'employee' =>
                      ['admin', 'manager', 'employee'].includes(role)
                    );
                  setNewUserForm((prev) => ({
                    ...prev,
                    roles: [...new Set(normalized)]
                  }));
                }}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
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
            <TextField
              label="Password"
              type="password"
              helperText={
                newUserForm.roles.length > 0
                  ? 'Required (min 6 chars) for admin-panel roles'
                  : 'Optional for students'
              }
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
    </Box>
  );
}
