import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import BookmarksRounded from '@mui/icons-material/BookmarksRounded';
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
  createAdminStudyGuide,
  createStudyGuideTopic,
  deleteAdminStudyGuide,
  deleteStudyGuideTopic,
  fetchAdminStudyGuides,
  fetchCountries,
  fetchStudyGuideTopics,
  type AdminStudyGuide,
  type AdminStudyGuideTopic,
  type Country,
  updateAdminStudyGuide,
  updateStudyGuideTopic
} from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

type TopicForm = {
  name: string;
  description: string;
};

type GuideForm = {
  title: string;
  summary: string;
  content: string;
  links: string;
  topicId: string;
  countryId: string;
};

export default function AdminStudyGuidesPage() {
  const { adminUser } = useAdminAuth();
  const isEmployee = adminUser?.role === 'employee';
  const [topics, setTopics] = useState<AdminStudyGuideTopic[]>([]);
  const [guides, setGuides] = useState<AdminStudyGuide[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingTopic, setSavingTopic] = useState(false);
  const [savingGuide, setSavingGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [topicPage, setTopicPage] = useState(0);
  const [topicRowsPerPage, setTopicRowsPerPage] = useState(10);
  const [guidePage, setGuidePage] = useState(0);
  const [guideRowsPerPage, setGuideRowsPerPage] = useState(10);

  const [editingTopic, setEditingTopic] = useState<AdminStudyGuideTopic | null>(null);
  const [editingGuide, setEditingGuide] = useState<AdminStudyGuide | null>(null);

  const [topicForm, setTopicForm] = useState<TopicForm>({ name: '', description: '' });
  const [guideForm, setGuideForm] = useState<GuideForm>({
    title: '',
    summary: '',
    content: '',
    links: '',
    topicId: '',
    countryId: ''
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [topicRows, guideRows, countryRows] = await Promise.all([
          fetchStudyGuideTopics(),
          fetchAdminStudyGuides(),
          fetchCountries()
        ]);
        if (!mounted) return;
        setTopics(topicRows);
        setGuides(guideRows);
        setCountries(countryRows);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load study guides');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => a.name.localeCompare(b.name)),
    [topics]
  );

  const sortedGuides = useMemo(
    () => [...guides].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()),
    [guides]
  );

  const pagedTopics = useMemo(() => {
    const start = topicPage * topicRowsPerPage;
    return sortedTopics.slice(start, start + topicRowsPerPage);
  }, [sortedTopics, topicPage, topicRowsPerPage]);

  const pagedGuides = useMemo(() => {
    const start = guidePage * guideRowsPerPage;
    return sortedGuides.slice(start, start + guideRowsPerPage);
  }, [sortedGuides, guidePage, guideRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedTopics.length / topicRowsPerPage) - 1);
    if (topicPage > maxPage) setTopicPage(maxPage);
  }, [sortedTopics.length, topicRowsPerPage, topicPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedGuides.length / guideRowsPerPage) - 1);
    if (guidePage > maxPage) setGuidePage(maxPage);
  }, [sortedGuides.length, guideRowsPerPage, guidePage]);

  function resetTopicForm() {
    setTopicForm({ name: '', description: '' });
    setEditingTopic(null);
  }

  function resetGuideForm() {
    setGuideForm({
      title: '',
      summary: '',
      content: '',
      links: '',
      topicId: sortedTopics[0] ? String(sortedTopics[0].id) : '',
      countryId: countries[0] ? String(countries[0].id || countries[0]._id) : ''
    });
    setEditingGuide(null);
  }

  function openCreateTopic() {
    resetTopicForm();
    setTopicDialogOpen(true);
  }

  function openEditTopic(item: AdminStudyGuideTopic) {
    setEditingTopic(item);
    setTopicForm({ name: item.name || '', description: item.description || '' });
    setTopicDialogOpen(true);
  }

  function openCreateGuide() {
    resetGuideForm();
    setGuideDialogOpen(true);
  }

  function openEditGuide(item: AdminStudyGuide) {
    setEditingGuide(item);
    setGuideForm({
      title: item.title || '',
      summary: item.summary || '',
      content: item.content || '',
      links: item.links || '',
      topicId: String(item.topicId),
      countryId: String(item.countryId)
    });
    setGuideDialogOpen(true);
  }

  async function submitTopic() {
    const name = topicForm.name.trim();
    if (!name) {
      setError('Topic name is required');
      return;
    }

    setSavingTopic(true);
    try {
      if (editingTopic) {
        const updated = await updateStudyGuideTopic(editingTopic.id, {
          name,
          description: topicForm.description.trim() || null
        });
        setTopics((prev) => prev.map((row) => (row.id === editingTopic.id ? updated : row)));
      } else {
        const created = await createStudyGuideTopic({
          name,
          description: topicForm.description.trim() || null
        });
        setTopics((prev) => [...prev, created]);
      }
      setTopicDialogOpen(false);
      resetTopicForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save topic');
    } finally {
      setSavingTopic(false);
    }
  }

  async function submitGuide() {
    const title = guideForm.title.trim();
    const topicId = Number(guideForm.topicId);
    const countryId = Number(guideForm.countryId);

    if (!title || !topicId || Number.isNaN(topicId) || !countryId || Number.isNaN(countryId)) {
      setError('Title, topic and country are required');
      return;
    }

    setSavingGuide(true);
    try {
      if (editingGuide) {
        const updated = await updateAdminStudyGuide(editingGuide.id, {
          title,
          summary: guideForm.summary.trim() || null,
          content: guideForm.content.trim() || null,
          links: guideForm.links.trim() || null,
          topicId,
          countryId
        });
        setGuides((prev) => prev.map((row) => (row.id === editingGuide.id ? updated : row)));
      } else {
        const created = await createAdminStudyGuide({
          title,
          summary: guideForm.summary.trim() || null,
          content: guideForm.content.trim() || null,
          links: guideForm.links.trim() || null,
          topicId,
          countryId
        });
        setGuides((prev) => [created, ...prev]);
      }
      setGuideDialogOpen(false);
      resetGuideForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save study guide');
    } finally {
      setSavingGuide(false);
    }
  }

  async function removeTopic(item: AdminStudyGuideTopic) {
    const ok = window.confirm(`Delete topic "${item.name}"? All linked study guides will also be deleted.`);
    if (!ok) return;
    try {
      await deleteStudyGuideTopic(item.id);
      setTopics((prev) => prev.filter((row) => row.id !== item.id));
      setGuides((prev) => prev.filter((row) => row.topicId !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete topic');
    }
  }

  async function removeGuide(item: AdminStudyGuide) {
    const ok = window.confirm(`Delete study guide "${item.title}"?`);
    if (!ok) return;
    try {
      await deleteAdminStudyGuide(item.id);
      setGuides((prev) => prev.filter((row) => row.id !== item.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete study guide');
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
            <BookmarksRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Study Guide Topics
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={loading ? 'Loading...' : `${topics.length} topics`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreateTopic}>
              Create Topic
            </Button>
          </Stack>
        </Box>
        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={860}
            maxBodyHeight={{
              xs: 'calc(100vh - 470px)',
              md: 'calc(100vh - 430px)'
            }}
            minBodyHeight={220}
            headerRow={
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`topic-skeleton-${idx}`}>
                      <TableCell colSpan={3}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedTopics.map((item) => (
                    <TableRow hover key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 520, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit topic">
                            <IconButton size="small" color="primary" onClick={() => openEditTopic(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {!isEmployee ? (
                            <Tooltip title="Delete topic">
                              <IconButton size="small" color="error" onClick={() => removeTopic(item)}>
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
              count={sortedTopics.length}
              page={topicPage}
              onPageChange={(_event, newPage) => setTopicPage(newPage)}
              rowsPerPage={topicRowsPerPage}
              onRowsPerPageChange={(event) => {
                setTopicRowsPerPage(parseInt(event.target.value, 10));
                setTopicPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          ) : null}
        </Box>
      </Box>

      <Box className="admin-panel">
        <Box className="admin-panel__head">
          <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
            <AutoStoriesRounded sx={{ fontSize: 18, color: '#0369a1' }} />
            Study Guides
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={loading ? 'Loading...' : `${guides.length} guides`} color="info" variant="outlined" />
            <Button size="small" variant="contained" onClick={openCreateGuide} disabled={!topics.length || !countries.length}>
              Create Guide
            </Button>
          </Stack>
        </Box>
        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={1080}
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
                <TableCell>Title</TableCell>
                <TableCell>Topic</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Summary</TableCell>
                <TableCell>Links</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`guide-skeleton-${idx}`}>
                      <TableCell colSpan={6}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedGuides.map((item) => (
                    <TableRow hover key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                      </TableCell>
                      <TableCell>{item.topicName}</TableCell>
                      <TableCell>{item.countryName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.summary || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.links || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit guide">
                            <IconButton size="small" color="primary" onClick={() => openEditGuide(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {!isEmployee ? (
                            <Tooltip title="Delete guide">
                              <IconButton size="small" color="error" onClick={() => removeGuide(item)}>
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
              count={sortedGuides.length}
              page={guidePage}
              onPageChange={(_event, newPage) => setGuidePage(newPage)}
              rowsPerPage={guideRowsPerPage}
              onRowsPerPageChange={(event) => {
                setGuideRowsPerPage(parseInt(event.target.value, 10));
                setGuidePage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          ) : null}
        </Box>
      </Box>

      <Dialog open={topicDialogOpen} onClose={() => setTopicDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Topic Name"
              value={topicForm.name}
              onChange={(event) => setTopicForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={topicForm.description}
              onChange={(event) => setTopicForm((prev) => ({ ...prev, description: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopicDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={submitTopic} disabled={savingTopic}>
            {savingTopic ? 'Saving...' : editingTopic ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={guideDialogOpen} onClose={() => setGuideDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingGuide ? 'Edit Study Guide' : 'Create Study Guide'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={guideForm.title}
              onChange={(event) => setGuideForm((prev) => ({ ...prev, title: event.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="guide-topic-label">Topic</InputLabel>
                <Select
                  labelId="guide-topic-label"
                  label="Topic"
                  value={guideForm.topicId}
                  onChange={(event) => setGuideForm((prev) => ({ ...prev, topicId: String(event.target.value) }))}
                >
                  {sortedTopics.map((topic) => (
                    <MenuItem key={topic.id} value={String(topic.id)}>
                      {topic.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="guide-country-label">Country</InputLabel>
                <Select
                  labelId="guide-country-label"
                  label="Country"
                  value={guideForm.countryId}
                  onChange={(event) => setGuideForm((prev) => ({ ...prev, countryId: String(event.target.value) }))}
                >
                  {countries.map((country) => (
                    <MenuItem key={String(country.id || country._id)} value={String(country.id || country._id)}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Short Summary"
              value={guideForm.summary}
              onChange={(event) => setGuideForm((prev) => ({ ...prev, summary: event.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Content"
              value={guideForm.content}
              onChange={(event) => setGuideForm((prev) => ({ ...prev, content: event.target.value }))}
              multiline
              minRows={8}
              fullWidth
            />
            <TextField
              label="Links (comma separated)"
              value={guideForm.links}
              onChange={(event) => setGuideForm((prev) => ({ ...prev, links: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuideDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={submitGuide} disabled={savingGuide}>
            {savingGuide ? 'Saving...' : editingGuide ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
