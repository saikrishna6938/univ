import StarRounded from '@mui/icons-material/StarRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Skeleton, Stack, TableCell, TablePagination, TableRow, TableSortLabel, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { createFeatured, deleteFeatured, fetchCountries, fetchFeatured, searchPrograms, type Country, type FeaturedUniversity, type Program, updateFeatured } from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import './admin.css';

type SortField = 'universityName' | 'programName' | 'countryName' | 'applicationFee' | 'discount';
type SortDirection = 'asc' | 'desc';

export default function AdminFeaturedUniversitiesPage() {
  const [rows, setRows] = useState<FeaturedUniversity[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('universityName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<FeaturedUniversity | null>(null);
  const [form, setForm] = useState({
    countryId: '',
    programId: '',
    universityImage: '',
    applicationFee: '',
    discount: ''
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [data, countryRows] = await Promise.all([fetchFeatured(), fetchCountries()]);
        if (!mounted) return;
        setRows(data);
        setCountries(countryRows);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load featured universities');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPrograms() {
      const selectedCountryId = Number(form.countryId);
      if (!selectedCountryId || Number.isNaN(selectedCountryId)) {
        setPrograms([]);
        return;
      }

      try {
        const data = await searchPrograms({ country: String(selectedCountryId) });
        if (!mounted) return;
        setPrograms(data);
      } catch {
        if (!mounted) return;
        setPrograms([]);
      }
    }

    loadPrograms();
    return () => {
      mounted = false;
    };
  }, [form.countryId]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      const aVal = sortField === 'applicationFee' ? Number(a.applicationFee ?? -1) : sortField === 'discount' ? Number(a.discount ?? -1) : String(a[sortField] ?? '');
      const bVal = sortField === 'applicationFee' ? Number(b.applicationFee ?? -1) : sortField === 'discount' ? Number(b.discount ?? -1) : String(b[sortField] ?? '');

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return a.id - b.id;
      }

      const result = collator.compare(String(aVal), String(bVal));
      if (result !== 0) return result * direction;
      return a.id - b.id;
    });
  }, [rows, sortField, sortDirection]);

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

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    return (
      <TableSortLabel active={sortField === field} direction={sortField === field ? sortDirection : 'asc'} onClick={() => handleSort(field)}>
        {label}
      </TableSortLabel>
    );
  }

  function resetForm() {
    setForm({ countryId: '', programId: '', universityImage: '', applicationFee: '', discount: '' });
    setPrograms([]);
  }

  function openCreateDialog() {
    setDialogMode('create');
    setEditingItem(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(item: FeaturedUniversity) {
    setDialogMode('edit');
    setEditingItem(item);
    setForm({
      countryId: String(item.countryId),
      programId: String(item.programId),
      universityImage: item.universityImage || '',
      applicationFee: item.applicationFee != null ? String(item.applicationFee) : '',
      discount: item.discount != null ? String(item.discount) : ''
    });
    setIsDialogOpen(true);
  }

  async function submitForm() {
    const countryId = Number(form.countryId);
    const programId = Number(form.programId);
    const applicationFee = form.applicationFee.trim() === '' ? null : Number(form.applicationFee);
    const discount = form.discount.trim() === '' ? null : Number(form.discount);

    if (!countryId || Number.isNaN(countryId) || !programId || Number.isNaN(programId)) {
      setError('Country and program are required');
      return;
    }
    if (applicationFee !== null && Number.isNaN(applicationFee)) {
      setError('Application fee must be a valid number');
      return;
    }
    if (discount !== null && Number.isNaN(discount)) {
      setError('Discount must be a valid number');
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === 'create') {
        const created = await createFeatured({
          countryId,
          programId,
          universityImage: form.universityImage.trim() || null,
          applicationFee,
          discount
        });
        setRows((prev) => [created, ...prev]);
      } else if (editingItem) {
        const updated = await updateFeatured(editingItem.id, {
          countryId,
          programId,
          universityImage: form.universityImage.trim() || null,
          applicationFee,
          discount
        });
        setRows((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save featured university');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: FeaturedUniversity) {
    const ok = window.confirm(`Delete featured entry for "${item.universityName}"?`);
    if (!ok) return;

    try {
      await deleteFeatured(item.id);
      setRows((prev) => prev.filter((row) => row.id !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete featured university');
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
            <StarRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Featured Universities
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={loading ? 'Loading...' : `${rows.length} records`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreateDialog}>
              Create New
            </Button>
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={1020}
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
                <TableCell><SortHeader field="universityName" label="University" /></TableCell>
                <TableCell><SortHeader field="programName" label="Program" /></TableCell>
                <TableCell><SortHeader field="countryName" label="Country" /></TableCell>
                <TableCell><SortHeader field="applicationFee" label="Application Fee" /></TableCell>
                <TableCell><SortHeader field="discount" label="Discount" /></TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow key={`featured-skeleton-${idx}`}>
                      <TableCell colSpan={6}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedRows.map((item) => (
                    <TableRow hover key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {item.universityName}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.programName}</TableCell>
                      <TableCell>{item.countryName}</TableCell>
                      <TableCell>{item.applicationFee != null ? `$${Number(item.applicationFee).toFixed(2)}` : '-'}</TableCell>
                      <TableCell>{item.discount != null ? `${Number(item.discount)}%` : '-'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit featured university">
                            <IconButton size="small" color="primary" onClick={() => openEditDialog(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete featured university">
                            <IconButton size="small" color="error" onClick={() => removeItem(item)}>
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

      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{dialogMode === 'create' ? 'Create Featured University' : 'Edit Featured University'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="featured-country-label">Country</InputLabel>
              <Select
                labelId="featured-country-label"
                label="Country"
                value={form.countryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, countryId: String(event.target.value), programId: '', applicationFee: '' }))
                }
              >
                {countries.map((country) => (
                  <MenuItem key={String(country.id || country._id)} value={String(country.id || country._id)}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!form.countryId}>
              <Autocomplete
                options={programs}
                value={
                  programs.find((program) => String(program.id || program._id) === form.programId) || null
                }
                onChange={(_, value) =>
                  setForm((prev) => ({
                    ...prev,
                    programId: value ? String(value.id || value._id) : '',
                    applicationFee:
                      value && value.applicationFee !== undefined && value.applicationFee !== null
                        ? String(value.applicationFee)
                        : ''
                  }))
                }
                getOptionLabel={(option) => `${option.universityName} • ${option.programName}`}
                isOptionEqualToValue={(option, value) =>
                  String(option.id || option._id) === String(value.id || value._id)
                }
                disabled={!form.countryId}
                renderInput={(params) => <TextField {...(params as any)} label="Program" placeholder="Type to filter programs" />}
              />
            </FormControl>

            <TextField
              fullWidth
              label="University Image URL"
              value={form.universityImage}
              onChange={(event) => setForm((prev) => ({ ...prev, universityImage: event.target.value }))}
            />

            <TextField
              fullWidth
              type="number"
              label="Discount (%)"
              value={form.discount}
              onChange={(event) => setForm((prev) => ({ ...prev, discount: event.target.value }))}
            />

            <TextField
              fullWidth
              label="Application Fee"
              type="number"
              value={form.applicationFee}
              onChange={(event) => setForm((prev) => ({ ...prev, applicationFee: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsDialogOpen(false);
              setEditingItem(null);
              resetForm();
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>
            {saving ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
