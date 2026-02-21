import EditRounded from '@mui/icons-material/EditRounded';
import {
  Alert,
  Box,
  Button,
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
import { useEffect, useState } from 'react';
import type { Country, Program } from '../../lib/api';
import { fetchCountries, fetchProgramsPage, updateProgram } from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import './admin.css';

type ProgramEditor = {
  id: string;
  programName: string;
  universityName: string;
  concentration: string;
  levelOfStudy: string;
  location: string;
  languageOfStudy: string;
  tuitionFeePerYear: string;
  applicationFee: string;
  intakes: string;
  deadlines: string;
  countryId: string;
};

function getProgramId(program: Program) {
  return String(program.id ?? program._id ?? '');
}

function makeEditor(program: Program): ProgramEditor {
  return {
    id: getProgramId(program),
    programName: program.programName || '',
    universityName: program.universityName || '',
    concentration: program.concentration || '',
    levelOfStudy: program.levelOfStudy || '',
    location: program.location || '',
    languageOfStudy: program.languageOfStudy || '',
    tuitionFeePerYear: program.tuitionFeePerYear !== undefined && program.tuitionFeePerYear !== null ? String(program.tuitionFeePerYear) : '',
    applicationFee: program.applicationFee !== undefined && program.applicationFee !== null ? String(program.applicationFee) : '',
    intakes: program.intakes || '',
    deadlines: program.deadlines || '',
    countryId: program.country?.id ? String(program.country.id) : ''
  };
}

export default function AdminProgramsPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [totalPrograms, setTotalPrograms] = useState(0);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [countryFilter, setCountryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorData, setEditorData] = useState<ProgramEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    let mounted = true;
    async function loadCountries() {
      setLoadingCountries(true);
      try {
        const rows = await fetchCountries();
        if (!mounted) return;
        setCountries(rows);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load countries');
      } finally {
        if (mounted) setLoadingCountries(false);
      }
    }

    loadCountries();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(0);
  }, [countryFilter, search]);

  useEffect(() => {
    let mounted = true;

    async function loadPrograms() {
      setLoadingPrograms(true);
      try {
        const data = await fetchProgramsPage({
          countryId: countryFilter === 'all' ? undefined : countryFilter,
          search: search.trim() || undefined,
          offset: page * rowsPerPage,
          limit: rowsPerPage
        });
        if (!mounted) return;
        setPrograms(data.items);
        setTotalPrograms(data.total);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load programs');
      } finally {
        if (mounted) setLoadingPrograms(false);
      }
    }

    loadPrograms();
    return () => {
      mounted = false;
    };
  }, [countryFilter, search, page, rowsPerPage]);

  function openEditor(program: Program) {
    setEditorData(makeEditor(program));
    setEditorOpen(true);
  }

  async function saveProgram() {
    if (!editorData) return;
    setSaving(true);
    try {
      const updated = await updateProgram(editorData.id, {
        programName: editorData.programName,
        universityName: editorData.universityName,
        concentration: editorData.concentration,
        levelOfStudy: editorData.levelOfStudy,
        location: editorData.location,
        languageOfStudy: editorData.languageOfStudy,
        tuitionFeePerYear: editorData.tuitionFeePerYear === '' ? null : Number(editorData.tuitionFeePerYear),
        applicationFee: editorData.applicationFee === '' ? null : Number(editorData.applicationFee),
        intakes: editorData.intakes,
        deadlines: editorData.deadlines,
        countryId: editorData.countryId || null
      });

      setPrograms((prev) => prev.map((item) => (getProgramId(item) === getProgramId(updated) ? updated : item)));
      setEditorOpen(false);
      setEditorData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save program');
    } finally {
      setSaving(false);
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
          <Typography variant="h6" fontWeight={800}>
            Programs Manager
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search university or program"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={loadingCountries}>
              <InputLabel id="country-filter-label">Country</InputLabel>
              <Select
                labelId="country-filter-label"
                value={countryFilter}
                label="Country"
                onChange={(event) => setCountryFilter(event.target.value)}
              >
                <MenuItem value="all">All countries</MenuItem>
                {countries.map((country) => {
                  const id = String(country.id ?? country._id ?? '');
                  return (
                    <MenuItem key={id} value={id}>
                      {country.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={980}
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
                <TableCell>Program</TableCell>
                <TableCell>University</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Tuition / year</TableCell>
                <TableCell>Intakes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            }
            bodyRows={
              loadingPrograms
                ? Array.from({ length: 7 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={6}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : programs.map((program) => (
                    <TableRow key={getProgramId(program)} hover>
                      <TableCell>{program.programName}</TableCell>
                      <TableCell>{program.universityName}</TableCell>
                      <TableCell>{program.country?.name ?? '-'}</TableCell>
                      <TableCell>{program.tuitionFeePerYear ?? '-'}</TableCell>
                      <TableCell>{program.intakes ?? '-'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit program">
                          <IconButton size="small" onClick={() => openEditor(program)}>
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
            }
          />
          {!loadingPrograms ? (
            <TablePagination
              component="div"
              count={totalPrograms}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[50]}
            />
          ) : null}
        </Box>
      </Box>

      <Dialog fullWidth maxWidth="md" open={editorOpen} onClose={() => setEditorOpen(false)}>
        <DialogTitle>Edit Program</DialogTitle>
        <DialogContent>
          {editorData ? (
            <Box sx={{ display: 'grid', gap: 1.7, mt: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="Program name" value={editorData.programName} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, programName: event.target.value } : null))} fullWidth />
              <TextField label="University" value={editorData.universityName} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, universityName: event.target.value } : null))} fullWidth />
              <TextField label="Concentration" value={editorData.concentration} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, concentration: event.target.value } : null))} fullWidth />
              <TextField label="Level of study" value={editorData.levelOfStudy} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, levelOfStudy: event.target.value } : null))} fullWidth />
              <TextField label="Location" value={editorData.location} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, location: event.target.value } : null))} fullWidth />
              <TextField label="Language" value={editorData.languageOfStudy} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, languageOfStudy: event.target.value } : null))} fullWidth />
              <TextField label="Tuition fee / year" type="number" value={editorData.tuitionFeePerYear} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, tuitionFeePerYear: event.target.value } : null))} fullWidth />
              <TextField label="Application fee" type="number" value={editorData.applicationFee} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, applicationFee: event.target.value } : null))} fullWidth />
              <TextField label="Intakes" value={editorData.intakes} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, intakes: event.target.value } : null))} fullWidth />
              <TextField label="Deadlines" value={editorData.deadlines} onChange={(event) => setEditorData((prev) => (prev ? { ...prev, deadlines: event.target.value } : null))} fullWidth />
              <FormControl fullWidth>
                <InputLabel id="editor-country-label">Country</InputLabel>
                <Select
                  labelId="editor-country-label"
                  value={editorData.countryId}
                  label="Country"
                  onChange={(event) => setEditorData((prev) => (prev ? { ...prev, countryId: event.target.value } : null))}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {countries.map((country) => {
                    const id = String(country.id ?? country._id ?? '');
                    return (
                      <MenuItem key={id} value={id}>
                        {country.name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={saveProgram} variant="contained" disabled={saving || !editorData}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
