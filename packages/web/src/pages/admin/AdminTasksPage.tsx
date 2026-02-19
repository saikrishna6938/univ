import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
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
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import type { EmployeeTask } from '../../lib/api';
import { fetchEmployeeTasks, updateEmployeeTask } from '../../lib/api';
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
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [taskStatus, setTaskStatus] = useState<'under_process' | 'completed'>('under_process');
  const [taskNotes, setTaskNotes] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
          <TableContainer sx={{ maxHeight: 720 }}>
            <Table stickyHeader size="small">
              <TableHead>
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
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 10 }).map((_, idx) => (
                      <TableRow key={`task-skeleton-${idx}`}>
                        <TableCell colSpan={9}>
                          <Skeleton height={30} />
                        </TableCell>
                      </TableRow>
                    ))
                  : sortedTasks.map((task) => (
                      <TableRow hover key={task.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {task.applicantName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{task.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.phone || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{task.programName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.universityName || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{task.countryName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">
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
                        <TableCell>{task.taskNotes || '-'}</TableCell>
                        <TableCell>{new Date(task.createdAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" onClick={() => openManageDialog(task)}>
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
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
    </Box>
  );
}
