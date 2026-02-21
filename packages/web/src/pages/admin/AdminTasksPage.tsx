import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
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
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  IconButton,
  TableCell,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import type { EmployeeTask, StudentDocument } from '../../lib/api';
import { fetchApplicationStudentDocuments, fetchEmployeeTasks, updateEmployeeTask } from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import './admin.css';

type SortField =
  | 'applicantName'
  | 'email'
  | 'programName'
  | 'countryName'
  | 'taskStatus'
  | 'taskAgingStatus'
  | 'createdAt';
type SortDirection = 'asc' | 'desc';

function getTaskAgingStatus(task: EmployeeTask): 'on_time' | 'aging' | 'critical' | null {
  if ((task.taskStatus || 'under_process') !== 'under_process') return null;
  if (task.taskAgingStatus) return task.taskAgingStatus;

  const lastUpdatedAt = task.taskUpdatedAt || task.createdAt;
  const updatedTime = new Date(lastUpdatedAt).getTime();
  if (Number.isNaN(updatedTime)) return 'on_time';

  const diffHours = (Date.now() - updatedTime) / (1000 * 60 * 60);
  if (diffHours < 24) return 'on_time';
  if (diffHours >= 24 * 6) return 'critical';
  return 'aging';
}

export default function AdminTasksPage() {
  const { adminUser } = useAdminAuth();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [taskStatus, setTaskStatus] = useState<'under_process' | 'completed'>('under_process');
  const [taskNotes, setTaskNotes] = useState('');
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsTask, setDocumentsTask] = useState<EmployeeTask | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let mounted = true;

    async function loadTasks() {
      if (!adminUser?.id) return;
      setLoading(true);
      try {
        const rows = await fetchEmployeeTasks(adminUser.id);
        if (!mounted) return;
        setTasks(rows);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTasks();
    return () => {
      mounted = false;
    };
  }, [adminUser?.id]);

  function compareValue(task: EmployeeTask, field: SortField): string | number {
    if (field === 'createdAt') return new Date(task.createdAt).getTime();
    if (field === 'taskStatus') {
      const order: Record<string, number> = { under_process: 1, completed: 2 };
      return order[task.taskStatus || 'under_process'] || 99;
    }
    if (field === 'taskAgingStatus') {
      const order: Record<string, number> = { on_time: 1, aging: 2, critical: 3 };
      const value = getTaskAgingStatus(task);
      return value ? order[value] : 99;
    }
    if (field === 'programName') return task.programName || '';
    if (field === 'countryName') return task.countryName || '';
    return String(task[field] || '');
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  const sortedTasks = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...tasks].sort((a, b) => {
      const aValue = compareValue(a, sortField);
      const bValue = compareValue(b, sortField);
      const aEmpty = aValue === '' || aValue === null || aValue === undefined || Number.isNaN(aValue as number);
      const bEmpty = bValue === '' || bValue === null || bValue === undefined || Number.isNaN(bValue as number);

      if (aEmpty && bEmpty) return a.id - b.id;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return a.id - b.id;
      }

      const result = collator.compare(String(aValue), String(bValue));
      if (result !== 0) return result * direction;
      return a.id - b.id;
    });
  }, [tasks, sortField, sortDirection]);

  const pagedTasks = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedTasks.slice(start, start + rowsPerPage);
  }, [sortedTasks, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedTasks.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [sortedTasks.length, rowsPerPage, page]);

  function SortableHeader({ field, label }: { field: SortField; label: string }) {
    return (
      <TableSortLabel active={sortField === field} direction={sortField === field ? sortDirection : 'asc'} onClick={() => handleSort(field)}>
        {label}
      </TableSortLabel>
    );
  }

  function openManageDialog(task: EmployeeTask) {
    setSelectedTask(task);
    setTaskStatus(task.taskStatus || 'under_process');
    setTaskNotes(task.taskNotes || '');
  }

  async function saveTask() {
    if (!adminUser?.id || !selectedTask) return;
    setSaving(true);
    try {
      const updated = await updateEmployeeTask({
        applicationId: selectedTask.id,
        employeeUserId: adminUser.id,
        taskStatus,
        taskNotes: taskNotes.trim() || null
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                taskStatus: updated.taskStatus,
                taskNotes: updated.taskNotes || null,
                taskUpdatedAt: updated.updatedAt
              }
            : task
        )
      );
      setSelectedTask(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  async function openDocumentsDialog(task: EmployeeTask) {
    if (!adminUser?.id) return;
    setDocumentsTask(task);
    setDocumentsOpen(true);
    setDocuments([]);
    setDocumentsLoading(true);
    try {
      const rows = await fetchApplicationStudentDocuments(task.id, adminUser.id);
      setDocuments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student documents');
    } finally {
      setDocumentsLoading(false);
    }
  }

  function toAbsoluteFileUrl(url?: string | null) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${apiUrl}${url}`;
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
            <ChecklistRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Tasks
          </Typography>
          <Chip label={loading ? 'Loading...' : `${tasks.length} tasks`} color="info" variant="outlined" />
        </Box>

        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={1280}
            tableLayout="auto"
            maxBodyHeight={{
              xs: 'calc(100vh - 390px)',
              md: 'calc(100vh - 360px)'
            }}
            minBodyHeight={{
              xs: 'calc(100vh - 500px)',
              md: 'calc(100vh - 450px)'
            }}
            headerSx={{
              '& .MuiTableCell-root': {
                maxWidth: 200,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }}
            bodySx={{
              '& .MuiTableCell-root': {
                maxWidth: 200
              }
            }}
            headerRow={
              <TableRow>
                <TableCell><SortableHeader field="applicantName" label="Applicant" /></TableCell>
                <TableCell><SortableHeader field="email" label="Applicant Contact" /></TableCell>
                <TableCell><SortableHeader field="programName" label="Program" /></TableCell>
                <TableCell><SortableHeader field="countryName" label="Country" /></TableCell>
                <TableCell><SortableHeader field="taskStatus" label="Task Status" /></TableCell>
                <TableCell><SortableHeader field="taskAgingStatus" label="Aging" /></TableCell>
                <TableCell>Task Notes</TableCell>
                <TableCell><SortableHeader field="createdAt" label="Created" /></TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow key={`task-skeleton-${idx}`}>
                      <TableCell colSpan={9}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedTasks.map((task) => (
                    <TableRow hover key={task.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {task.applicantName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{task.email}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {task.phone || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{task.programName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {task.universityName || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{task.countryName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {task.countryIsoCode || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={task.taskStatus === 'completed' ? 'Completed' : 'Under Process'}
                            color={task.taskStatus === 'completed' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const agingStatus = getTaskAgingStatus(task);
                            if (!agingStatus) return '-';
                            if (agingStatus === 'on_time') return <Chip size="small" label="On Time" color="success" variant="outlined" />;
                            if (agingStatus === 'aging') return <Chip size="small" label="Aging" color="warning" variant="outlined" />;
                            return <Chip size="small" label="Critical" color="error" variant="outlined" />;
                          })()}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.taskNotes || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(task.createdAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View student documents">
                              <IconButton size="small" color="primary" onClick={() => openDocumentsDialog(task)}>
                                <DescriptionRounded fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Manage task">
                              <IconButton size="small" color="primary" onClick={() => openManageDialog(task)}>
                                <EditOutlined fontSize="small" />
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
              count={sortedTasks.length}
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

      <Dialog fullWidth maxWidth="sm" open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)}>
        <DialogTitle>Manage Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedTask
                ? `${selectedTask.applicantName} • ${selectedTask.countryName || 'Unknown country'}`
                : ''}
            </Typography>

            <FormControl fullWidth>
              <InputLabel id="task-status-label">Task Status</InputLabel>
              <Select
                labelId="task-status-label"
                value={taskStatus}
                label="Task Status"
                onChange={(event) => setTaskStatus(event.target.value as 'under_process' | 'completed')}
              >
                <MenuItem value="under_process">Under Process</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Task Notes"
              multiline
              minRows={4}
              value={taskNotes}
              onChange={(event) => setTaskNotes(event.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTask(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={saveTask} disabled={saving || !selectedTask}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="md" open={documentsOpen} onClose={() => setDocumentsOpen(false)}>
        <DialogTitle>
          Student Documents
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {documentsTask
              ? `${documentsTask.applicantName} • ${documentsTask.email}`
              : ''}
          </Typography>
          <Stack spacing={1}>
            {documentsLoading ? (
              Array.from({ length: 4 }).map((_, idx) => <Skeleton key={`doc-skeleton-${idx}`} height={34} />)
            ) : documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded by this student.
              </Typography>
            ) : (
              documents.map((doc) => (
                <Box key={doc.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, p: 1.2, bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" fontWeight={700}>
                    {doc.documentName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.originalFileName || '-'} • {new Date(doc.createdAt).toLocaleString()}
                  </Typography>
                  <Box sx={{ mt: 0.8 }}>
                    <Button
                      component="a"
                      href={toAbsoluteFileUrl(doc.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      size="small"
                      variant="outlined"
                    >
                      View / Download
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentsOpen(false)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
