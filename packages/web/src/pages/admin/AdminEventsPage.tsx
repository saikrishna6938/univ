import EventRounded from '@mui/icons-material/EventRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  createAdminEvent,
  deleteAdminEvent,
  fetchAdminEvents,
  type AdminEvent,
  updateAdminEvent
} from '../../lib/api';
import './admin.css';

type EventForm = {
  degree: string;
  program: string;
  university: string;
  logo: string;
  title: string;
  eventDate: string;
};

function toInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState<EventForm>({
    degree: '',
    program: '',
    university: '',
    logo: '',
    title: '',
    eventDate: ''
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const rows = await fetchAdminEvents();
        if (!mounted) return;
        setEvents(rows);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  function resetForm() {
    setForm({ degree: '', program: '', university: '', logo: '', title: '', eventDate: '' });
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(item: AdminEvent) {
    setEditing(item);
    setForm({
      degree: item.degree || '',
      program: item.program || '',
      university: item.university || '',
      logo: item.logo || '',
      title: item.title || '',
      eventDate: toInputDate(item.eventDate)
    });
    setDialogOpen(true);
  }

  async function submit() {
    if (!form.degree.trim() || !form.program.trim() || !form.university.trim() || !form.title.trim() || !form.eventDate) {
      setError('Degree, program, university, title and event date are required');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminEvent(editing.id, {
          degree: form.degree.trim(),
          program: form.program.trim(),
          university: form.university.trim(),
          logo: form.logo.trim() || null,
          title: form.title.trim(),
          eventDate: form.eventDate
        });
        setEvents((prev) => prev.map((row) => (row.id === editing.id ? updated : row)));
      } else {
        const created = await createAdminEvent({
          degree: form.degree.trim(),
          program: form.program.trim(),
          university: form.university.trim(),
          logo: form.logo.trim() || null,
          title: form.title.trim(),
          eventDate: form.eventDate
        });
        setEvents((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AdminEvent) {
    const ok = window.confirm(`Delete event "${item.title}"?`);
    if (!ok) return;
    try {
      await deleteAdminEvent(item.id);
      setEvents((prev) => prev.filter((row) => row.id !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
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
            <EventRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Events
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={loading ? 'Loading...' : `${events.length} events`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreate}>
              Create New
            </Button>
          </Stack>
        </Box>
        <Box className="admin-panel__body">
          <TableContainer sx={{ maxHeight: 700 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Degree</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>University</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, idx) => (
                      <TableRow key={`event-skeleton-${idx}`}>
                        <TableCell colSpan={6}>
                          <Skeleton height={30} />
                        </TableCell>
                      </TableRow>
                    ))
                  : events.map((item) => (
                      <TableRow hover key={item.id}>
                        <TableCell>{item.degree}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.university}</TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{new Date(item.eventDate).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" variant="outlined" onClick={() => openEdit(item)}>
                              Edit
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => remove(item)}>
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Event' : 'Create Event'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Degree" value={form.degree} onChange={(event) => setForm((prev) => ({ ...prev, degree: event.target.value }))} fullWidth />
            <TextField label="Program" value={form.program} onChange={(event) => setForm((prev) => ({ ...prev, program: event.target.value }))} fullWidth />
            <TextField label="University" value={form.university} onChange={(event) => setForm((prev) => ({ ...prev, university: event.target.value }))} fullWidth />
            <TextField label="Logo URL" value={form.logo} onChange={(event) => setForm((prev) => ({ ...prev, logo: event.target.value }))} fullWidth />
            <TextField label="Event Title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} fullWidth />
            <TextField label="Event Date" type="date" value={form.eventDate} onChange={(event) => setForm((prev) => ({ ...prev, eventDate: event.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
