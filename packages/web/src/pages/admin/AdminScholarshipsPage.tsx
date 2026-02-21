import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
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
  IconButton,
  TableCell,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  createAdminScholarship,
  deleteAdminScholarship,
  fetchAdminScholarships,
  fetchCountries,
  type AdminScholarship,
  type Country,
  updateAdminScholarship
} from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

type ScholarshipForm = {
  name: string;
  links: string;
  duration: string;
  deadline: string;
  description: string;
  countryId: string;
};

function toInputDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function AdminScholarshipsPage() {
  const { adminUser } = useAdminAuth();
  const isEmployee = adminUser?.role === 'employee';
  const [rows, setRows] = useState<AdminScholarship[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminScholarship | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [form, setForm] = useState<ScholarshipForm>({
    name: '',
    links: '',
    duration: '',
    deadline: '',
    description: '',
    countryId: ''
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [scholarships, countryRows] = await Promise.all([
          fetchAdminScholarships(),
          fetchCountries()
        ]);
        if (!mounted) return;
        setRows(scholarships);
        setCountries(countryRows);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load scholarships');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [rows]
  );

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedRows.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [sortedRows.length, rowsPerPage, page]);

  function resetForm() {
    setForm({
      name: '',
      links: '',
      duration: '',
      deadline: '',
      description: '',
      countryId: ''
    });
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(item: AdminScholarship) {
    setEditing(item);
    setForm({
      name: item.name || '',
      links: item.links || '',
      duration: item.duration || '',
      deadline: toInputDate(item.deadline),
      description: item.description || '',
      countryId: String(item.countryId)
    });
    setDialogOpen(true);
  }

  async function submit() {
    const name = form.name.trim();
    const countryId = Number(form.countryId);
    if (!name || !countryId || Number.isNaN(countryId)) {
      setError('Scholarship name and country are required');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminScholarship(editing.id, {
          name,
          links: form.links.trim() || null,
          duration: form.duration.trim() || null,
          deadline: form.deadline || null,
          description: form.description.trim() || null,
          countryId
        });
        setRows((prev) => prev.map((row) => (row.id === editing.id ? updated : row)));
      } else {
        const created = await createAdminScholarship({
          name,
          links: form.links.trim() || null,
          duration: form.duration.trim() || null,
          deadline: form.deadline || null,
          description: form.description.trim() || null,
          countryId
        });
        setRows((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scholarship');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AdminScholarship) {
    const ok = window.confirm(`Delete scholarship "${item.name}"?`);
    if (!ok) return;

    try {
      await deleteAdminScholarship(item.id);
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scholarship');
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
            <WorkspacePremiumRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Scholarships
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={loading ? 'Loading...' : `${rows.length} scholarships`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreate}>
              Create New
            </Button>
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={1100}
            maxBodyHeight={{
              xs: 'calc(100vh - 390px)',
              md: 'calc(100vh - 360px)'
            }}
            minBodyHeight={{
              xs: 'calc(100vh - 500px)',
              md: 'calc(100vh - 450px)'
            }}
            headerRow={
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Deadline</TableCell>
                <TableCell>Links</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`scholarship-skeleton-${idx}`}>
                      <TableCell colSpan={7}>
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
                      <TableCell>{item.countryName}</TableCell>
                      <TableCell>{item.duration || '-'}</TableCell>
                      <TableCell>{item.deadline ? new Date(item.deadline).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.links || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit scholarship">
                            <IconButton size="small" color="primary" onClick={() => openEdit(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {!isEmployee ? (
                            <Tooltip title="Delete scholarship">
                              <IconButton size="small" color="error" onClick={() => remove(item)}>
                                <DeleteOutlineRounded fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
            }
          />
          {!loading ? (
            <TablePagination
              component="div"
              count={sortedRows.length}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Scholarship' : 'Create Scholarship'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Scholarship Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="scholarship-country-label">Country</InputLabel>
              <Select
                labelId="scholarship-country-label"
                label="Country"
                value={form.countryId}
                onChange={(event) => setForm((prev) => ({ ...prev, countryId: String(event.target.value) }))}
              >
                {countries.map((country) => (
                  <MenuItem key={String(country.id || country._id)} value={String(country.id || country._id)}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Links (comma separated)"
              value={form.links}
              onChange={(event) => setForm((prev) => ({ ...prev, links: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Duration"
              value={form.duration}
              onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              fullWidth
            />
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
