import GroupRounded from '@mui/icons-material/GroupRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import MoveDownOutlined from '@mui/icons-material/MoveDownOutlined';
import PanToolAltOutlined from '@mui/icons-material/PanToolAltOutlined';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
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
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminEntity, AdminListUser, LeadConversation, LeadConversationStatus, LeadType } from '../../lib/api';
import {
  bulkCreateAdminUsers,
  createAdminUser,
  deleteAdminUser,
  fetchAdminEntities,
  fetchAdminUsers,
  fetchLeadConversations,
  releaseLeadConversation,
  takeLeadConversation,
  updateAdminUser,
  upsertLeadConversation
} from '../../lib/api';
import { toApiLocalDateTime, toLocalInputDateTime } from '../../lib/datetime';
import AdminDataTable from '../../components/admin/AdminDataTable';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

type ConversationForm = {
  name: string;
  email: string;
  phone: string;
  city: string;
  preferredCountry: string;
  programLevel: string;
  courseField: string;
  intake: string;
  budget: string;
  sourceOfLead: string;
  lookingFor: string;
  conversationStatus: LeadConversationStatus;
  notes: string;
  reminderAt: string;
  reminderDone: boolean;
  lastContactedAt: string;
};

type LeadFormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
};

type CsvUploadFormState = {
  leadName: string;
  leadEntityId: number | '';
  leadFrom: string;
  file: File | null;
};

type LeadGroupFilterValue = 'all' | 'active' | 'under-process' | 'closed';

const EMPTY_LEAD_FORM: LeadFormState = {
  name: '',
  email: '',
  phone: '',
  city: ''
};

const EMPTY_CSV_UPLOAD_FORM: CsvUploadFormState = {
  leadName: '',
  leadEntityId: '',
  leadFrom: '',
  file: null
};

const STATUS_OPTIONS: Array<{ value: LeadConversationStatus; label: string }> = [
  { value: 'Very Interested', label: 'Very Interested' },
  { value: 'Interested – Call Back', label: 'Interested – Call Back' },
  { value: 'Interested – Send Details', label: 'Interested – Send Details' },
  { value: 'Ready for Application', label: 'Ready for Application' },
  { value: 'Requested Meeting', label: 'Requested Meeting' },
  { value: 'Referred to Friend', label: 'Referred to Friend' },
  { value: 'Need More Time', label: 'Need More Time' },
  { value: 'Comparing Options', label: 'Comparing Options' },
  { value: 'Discussing with Family / Partner', label: 'Discussing with Family / Partner' },
  { value: 'Financial Planning in Process', label: 'Financial Planning in Process' },
  { value: 'Waiting for Results (IELTS / Exams / Documents)', label: 'Waiting for Results (IELTS / Exams / Documents)' },
  { value: 'Follow Up Later', label: 'Follow Up Later' },
  { value: 'Interested for Next Intake', label: 'Interested for Next Intake' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Budget Issue', label: 'Budget Issue' },
  { value: 'Going with Competitor', label: 'Going with Competitor' },
  { value: 'Change of Plans', label: 'Change of Plans' },
  { value: 'Course Not Suitable', label: 'Course Not Suitable' },
  { value: 'Country Not Preferred', label: 'Country Not Preferred' },
  { value: 'Already Enrolled Elsewhere', label: 'Already Enrolled Elsewhere' },
  { value: 'Fake / Invalid Lead', label: 'Fake / Invalid Lead' },
  { value: 'Connected', label: 'Connected' },
  { value: 'Service not available', label: 'Service not available' },
  { value: 'Call Not Answered', label: 'Call Not Answered' },
  { value: 'Call Disconnected', label: 'Call Disconnected' },
  { value: 'Switched Off', label: 'Switched Off' },
  { value: 'Number Busy', label: 'Number Busy' },
  { value: 'Wrong Number', label: 'Wrong Number' },
  { value: 'WhatsApp Sent', label: 'WhatsApp Sent' },
  { value: 'Left Voicemail', label: 'Left Voicemail' },
  { value: 'Awaiting Response', label: 'Awaiting Response' },
  { value: 'Closed', label: 'Closed' }
];

const HOT_STATUSES = new Set<LeadConversationStatus>([
  'Very Interested',
  'Interested – Call Back',
  'Interested – Send Details',
  'Ready for Application',
  'Requested Meeting',
  'Referred to Friend'
]);

const WARM_STATUSES = new Set<LeadConversationStatus>([
  'Need More Time',
  'Comparing Options',
  'Discussing with Family / Partner',
  'Financial Planning in Process',
  'Waiting for Results (IELTS / Exams / Documents)',
  'Follow Up Later',
  'Interested for Next Intake',
  'Connected',
  'Service not available',
  'Call Not Answered',
  'Call Disconnected',
  'Switched Off',
  'Number Busy',
  'WhatsApp Sent',
  'Left Voicemail',
  'Awaiting Response'
]);

const ACTIVE_BUCKET_STATUSES = new Set<LeadConversationStatus>([
  'Very Interested',
  'Interested – Call Back',
  'Interested – Send Details',
  'Ready for Application',
  'Requested Meeting',
  'Need More Time',
  'Comparing Options',
  'Discussing with Family / Partner',
  'Financial Planning in Process',
  'Waiting for Results (IELTS / Exams / Documents)',
  'Follow Up Later',
  'Interested for Next Intake',
  'Awaiting Response'
]);

const UNDER_PROCESS_BUCKET_STATUSES = new Set<LeadConversationStatus>([
  'Connected',
  'Service not available',
  'Call Not Answered',
  'Call Disconnected',
  'Switched Off',
  'Number Busy',
  'WhatsApp Sent',
  'Left Voicemail'
]);

const CLOSED_BUCKET_STATUSES = new Set<LeadConversationStatus>([
  'Not Interested',
  'Budget Issue',
  'Going with Competitor',
  'Change of Plans',
  'Course Not Suitable',
  'Country Not Preferred',
  'Already Enrolled Elsewhere',
  'Fake / Invalid Lead',
  'Wrong Number',
  'Closed'
]);

function getLeadTypeFromStatus(status: LeadConversationStatus): LeadType {
  if (HOT_STATUSES.has(status)) return 'HOT';
  if (WARM_STATUSES.has(status)) return 'WARM';
  return 'COLD';
}

function getEffectiveLeadType(conversation?: LeadConversation): LeadType | 'NEW' {
  if (!conversation || conversation.conversationStatus === 'Awaiting Response') return 'NEW';
  return conversation.leadType;
}

function getLeadTypeColor(type?: LeadType | 'NEW'): string {
  if (type === 'HOT') return '#16a34a';
  if (type === 'WARM') return '#f59e0b';
  if (type === 'NEW') return '#0284c7';
  return '#64748b';
}

function getStatusChipSx(type?: LeadType | 'NEW') {
  const background = type === 'HOT' ? '#dcfce7' : type === 'WARM' ? '#fef3c7' : type === 'NEW' ? '#e0f2fe' : '#e2e8f0';
  const foreground = type === 'HOT' ? '#166534' : type === 'WARM' ? '#92400e' : type === 'NEW' ? '#075985' : '#334155';
  const border = type === 'HOT' ? '#86efac' : type === 'WARM' ? '#fcd34d' : type === 'NEW' ? '#7dd3fc' : '#cbd5e1';

  return {
    bgcolor: background,
    color: foreground,
    border: `1px solid ${border}`,
    fontWeight: 700,
    '& .MuiChip-label': {
      px: 1.1
    }
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  out.push(current.trim());
  return out;
}

function getActingAdminRole(role?: string): 'admin' | 'manager' | 'employee' {
  if (role === 'admin' || role === 'manager' || role === 'employee') {
    return role;
  }
  return 'employee';
}

export default function AdminLeadsPage() {
  const { adminUser } = useAdminAuth();
  const [searchParams] = useSearchParams();
  const isEmployeeSession = adminUser?.role === 'employee';
  const isMyBucketView = searchParams.get('view') === 'my-bucket';
  const bucketStatusGroup = String(searchParams.get('bucketStatus') || '').trim().toLowerCase();
  const selectedLeadName = String(searchParams.get('leadName') || '').trim().toLowerCase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [leads, setLeads] = useState<AdminListUser[]>([]);
  const [entities, setEntities] = useState<AdminEntity[]>([]);
  const [conversationsByUserId, setConversationsByUserId] = useState<Record<number, LeadConversation>>({});
  const [loading, setLoading] = useState(true);
  const [savingConversation, setSavingConversation] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [uploadingLeads, setUploadingLeads] = useState(false);
  const [takingLeadId, setTakingLeadId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilterValue, setStatusFilterValue] = useState<LeadConversationStatus | 'all'>('all');
  const [leadTypeFilterValue, setLeadTypeFilterValue] = useState<'all' | 'HOT' | 'WARM' | 'COLD' | 'NEW'>('all');
  const [leadGroupFilterValue, setLeadGroupFilterValue] = useState<LeadGroupFilterValue>('all');
  const [entityFilterValue, setEntityFilterValue] = useState<'all' | number>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [editingConversationLead, setEditingConversationLead] = useState<AdminListUser | null>(null);
  const [editingLead, setEditingLead] = useState<AdminListUser | null>(null);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);
  const [editLeadForm, setEditLeadForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);
  const [csvUploadForm, setCsvUploadForm] = useState<CsvUploadFormState>(EMPTY_CSV_UPLOAD_FORM);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [conversationForm, setConversationForm] = useState<ConversationForm>({
    name: '',
    email: '',
    phone: '',
    city: '',
    preferredCountry: '',
    programLevel: '',
    courseField: '',
    intake: '',
    budget: '',
    sourceOfLead: '',
    lookingFor: '',
    conversationStatus: 'Awaiting Response',
    notes: '',
    reminderAt: '',
    reminderDone: false,
    lastContactedAt: ''
  });

  useEffect(() => {
    let mounted = true;

    async function loadLeads() {
      setLoading(true);
      try {
        const scopedViewerRoles =
          adminUser?.role === 'admin'
            ? undefined
            : (adminUser?.roles || [adminUser?.role || ''])
                .map((role) => String(role || '').trim().toLowerCase())
                .filter(Boolean);
        const [leadRows, conversations, entityRows] = await Promise.all([
          fetchAdminUsers('leads', {
            entityId: adminUser?.role === 'admin' && entityFilterValue !== 'all' ? Number(entityFilterValue) : undefined,
            viewerRoles: scopedViewerRoles
          }),
          fetchLeadConversations('leads'),
          fetchAdminEntities()
        ]);
        if (!mounted) return;
        setLeads(leadRows);
        const map: Record<number, LeadConversation> = {};
        conversations.forEach((conversation) => {
          map[conversation.userId] = conversation;
        });
        setConversationsByUserId(map);
        setEntities(entityRows);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load leads');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLeads();
    return () => {
      mounted = false;
    };
  }, [adminUser?.role, adminUser?.roles, entityFilterValue]);

  const filteredLeads = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const scopedLeads =
      isEmployeeSession && isMyBucketView
        ? leads.filter((lead) => conversationsByUserId[lead.id]?.assignedEmployeeUserId === adminUser?.id)
        : leads;

    const visibleLeads = scopedLeads.filter((lead) => {
      if (selectedLeadName && String(lead.leadName || '').trim().toLowerCase() !== selectedLeadName) {
        return false;
      }
      const conversation = conversationsByUserId[lead.id];
      const conversationStatus = conversation?.conversationStatus || 'Awaiting Response';

      if (isEmployeeSession && !isMyBucketView && conversation?.assignedEmployeeUserId === adminUser?.id) {
        return false;
      }

      if (isMyBucketView && bucketStatusGroup) {
        if (bucketStatusGroup === 'active' && !ACTIVE_BUCKET_STATUSES.has(conversationStatus)) return false;
        if (bucketStatusGroup === 'under-process' && !UNDER_PROCESS_BUCKET_STATUSES.has(conversationStatus)) return false;
        if (bucketStatusGroup === 'closed' && !CLOSED_BUCKET_STATUSES.has(conversationStatus)) return false;
      }

      if (!isMyBucketView && leadGroupFilterValue !== 'all') {
        if (leadGroupFilterValue === 'active' && !ACTIVE_BUCKET_STATUSES.has(conversationStatus)) return false;
        if (leadGroupFilterValue === 'under-process' && !UNDER_PROCESS_BUCKET_STATUSES.has(conversationStatus)) return false;
        if (leadGroupFilterValue === 'closed' && !CLOSED_BUCKET_STATUSES.has(conversationStatus)) return false;
      }

      if (statusFilterValue !== 'all') {
        if (conversationStatus !== statusFilterValue) return false;
      }
      if (leadTypeFilterValue !== 'all') {
        if (getEffectiveLeadType(conversation) !== leadTypeFilterValue) return false;
      }

      return true;
    });

    if (!query) return visibleLeads;
    return visibleLeads.filter((lead) =>
      [lead.name, lead.email, lead.phone].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [
    adminUser?.id,
    leadGroupFilterValue,
    conversationsByUserId,
    bucketStatusGroup,
    isEmployeeSession,
    isMyBucketView,
    leadTypeFilterValue,
    leads,
    searchText,
    selectedLeadName,
    statusFilterValue
  ]);

  const currentLeadGroupMeta = useMemo(() => {
    if (!selectedLeadName) return null;
    return (
      leads.find((lead) => {
        const leadName = String(lead.leadName || '').trim().toLowerCase();
        return leadName === selectedLeadName && lead.leadEntityId && lead.leadFrom;
      }) || null
    );
  }, [leads, selectedLeadName]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredLeads.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredLeads.length, page, rowsPerPage]);

  const pagedLeads = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLeads.slice(start, start + rowsPerPage);
  }, [filteredLeads, page, rowsPerPage]);

  const canManageLeads = adminUser?.role === 'admin' || adminUser?.role === 'manager';
  const pagedLeadIds = useMemo(() => pagedLeads.map((lead) => lead.id), [pagedLeads]);
  const selectedOnPageCount = useMemo(
    () => pagedLeadIds.filter((id) => selectedLeadIds.includes(id)).length,
    [pagedLeadIds, selectedLeadIds]
  );
  const allSelectedOnPage = pagedLeadIds.length > 0 && selectedOnPageCount === pagedLeadIds.length;
  const someSelectedOnPage = selectedOnPageCount > 0 && selectedOnPageCount < pagedLeadIds.length;

  useEffect(() => {
    setSelectedLeadIds((prev) => prev.filter((id) => filteredLeads.some((lead) => lead.id === id)));
  }, [filteredLeads]);

  function openConversationEditor(lead: AdminListUser) {
    const conversation = conversationsByUserId[lead.id];
    const takenByOtherEmployee =
      isEmployeeSession &&
      conversation?.assignedEmployeeUserId &&
      adminUser?.id &&
      conversation.assignedEmployeeUserId !== adminUser.id;

    if (takenByOtherEmployee) {
      setError(`${conversation.assignedEmployee?.name || 'Another employee'} already took this lead`);
      return;
    }

    setEditingConversationLead(lead);
    setConversationForm({
      name: lead.name || conversation?.user?.name || '',
      email: lead.email || conversation?.user?.email || '',
      phone: lead.phone || conversation?.user?.phone || '',
      city: lead.city || conversation?.user?.city || '',
      preferredCountry: conversation?.user?.preferredCountry || '',
      programLevel: conversation?.user?.programLevel || '',
      courseField: conversation?.user?.courseField || '',
      intake: conversation?.user?.intake || '',
      budget: conversation?.user?.budget || '',
      sourceOfLead: conversation?.user?.sourceOfLead || '',
      lookingFor: conversation?.lookingFor || '',
      conversationStatus: conversation?.conversationStatus || 'Awaiting Response',
      notes: conversation?.notes || '',
      reminderAt: toLocalInputDateTime(conversation?.reminderAt),
      reminderDone: conversation?.reminderDone || false,
      lastContactedAt: toLocalInputDateTime(conversation?.lastContactedAt)
    });
  }

  function openLeadEditor(lead: AdminListUser) {
    setEditingLead(lead);
    setEditLeadForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      city: lead.city || ''
    });
  }

  async function saveConversation() {
    if (!editingConversationLead) return;

    setSavingConversation(true);
    try {
      const saved = await upsertLeadConversation(editingConversationLead.id, {
        name: conversationForm.name.trim(),
        email: conversationForm.email.trim() || null,
        phone: conversationForm.phone.trim() || null,
        city: conversationForm.city.trim() || null,
        preferredCountry: conversationForm.preferredCountry.trim() || null,
        programLevel: conversationForm.programLevel.trim() || null,
        courseField: conversationForm.courseField.trim() || null,
        intake: conversationForm.intake.trim() || null,
        budget: conversationForm.budget.trim() || null,
        sourceOfLead: conversationForm.sourceOfLead.trim() || null,
        lookingFor: conversationForm.lookingFor.trim() || null,
        conversationStatus: conversationForm.conversationStatus,
        notes: conversationForm.notes.trim() || null,
        reminderAt: toApiLocalDateTime(conversationForm.reminderAt),
        reminderDone: conversationForm.reminderDone,
        lastContactedAt: toApiLocalDateTime(conversationForm.lastContactedAt),
        actingAdminUserId: adminUser?.id ?? null,
        actingAdminRole: getActingAdminRole(adminUser?.role)
      });
      setConversationsByUserId((prev) => ({ ...prev, [saved.userId]: saved }));
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === editingConversationLead.id
            ? {
                ...lead,
                name: saved.user?.name || conversationForm.name.trim(),
                email: saved.user?.email || conversationForm.email.trim() || undefined,
                phone: saved.user?.phone || conversationForm.phone.trim() || undefined,
                city: saved.user?.city || conversationForm.city.trim() || undefined
              }
            : lead
        )
      );
      setEditingConversationLead(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversation');
    } finally {
      setSavingConversation(false);
    }
  }

  async function takeLead(lead: AdminListUser) {
    if (!adminUser?.id || !isEmployeeSession) return;

    setTakingLeadId(lead.id);
    try {
      const saved = await takeLeadConversation(lead.id, adminUser.id);
      setConversationsByUserId((prev) => ({ ...prev, [saved.userId]: saved }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take lead');
    } finally {
      setTakingLeadId(null);
    }
  }

  async function releaseLead(lead: AdminListUser) {
    if (!adminUser?.id || !isEmployeeSession) return;

    setTakingLeadId(lead.id);
    try {
      const saved = await releaseLeadConversation(lead.id, adminUser.id);
      setConversationsByUserId((prev) => ({ ...prev, [saved.userId]: saved }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove lead from your bucket');
    } finally {
      setTakingLeadId(null);
    }
  }

  async function addLead() {
    if (!leadForm.name.trim()) {
      setError('Name is required');
      return;
    }

    if (selectedLeadName && !currentLeadGroupMeta) {
      setError('Selected lead list metadata is missing. Refresh the page or upload at least one lead in this list first.');
      return;
    }

    setCreatingLead(true);
    try {
      const created = await createAdminUser({
        name: leadForm.name.trim(),
        email: leadForm.email.trim() || undefined,
        phone: leadForm.phone.trim() || undefined,
        city: leadForm.city.trim() || undefined,
        role: 'uploaded',
        leadName: currentLeadGroupMeta?.leadName || undefined,
        leadFrom: currentLeadGroupMeta?.leadFrom || undefined,
        leadEntityId: currentLeadGroupMeta?.leadEntityId || undefined
      });

      setLeads((prev) => [created, ...prev]);
      setLeadForm(EMPTY_LEAD_FORM);
      setIsAddLeadOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lead');
    } finally {
      setCreatingLead(false);
    }
  }

  async function saveLeadEdit() {
    if (!editingLead) return;
    if (!editLeadForm.name.trim() || !editLeadForm.email.trim()) {
      setError('Name and email are required');
      return;
    }

    setUpdatingLead(true);
    try {
      const updated = await updateAdminUser(editingLead.id, {
        name: editLeadForm.name.trim(),
        email: editLeadForm.email.trim(),
        phone: editLeadForm.phone.trim() || undefined,
        city: editLeadForm.city.trim() || undefined
      });

      setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
      setEditingLead(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setUpdatingLead(false);
    }
  }

  async function removeLead(lead: AdminListUser) {
    const ok = window.confirm(`Delete lead "${lead.name}"?`);
    if (!ok) return;

    try {
      await deleteAdminUser(lead.id);
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
      setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
      setConversationsByUserId((prev) => {
        const next = { ...prev };
        delete next[lead.id];
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  }

  async function removeSelectedLeads() {
    if (!selectedLeadIds.length) return;
    const selectedIdsOnPage = pagedLeadIds.filter((id) => selectedLeadIds.includes(id));
    if (!selectedIdsOnPage.length) return;

    const ok = window.confirm(`Delete ${selectedIdsOnPage.length} selected lead(s) from this page?`);
    if (!ok) return;

    setSavingConversation(true);
    try {
      await Promise.all(selectedIdsOnPage.map((id) => deleteAdminUser(id)));
      setLeads((prev) => prev.filter((lead) => !selectedIdsOnPage.includes(lead.id)));
      setSelectedLeadIds((prev) => prev.filter((id) => !selectedIdsOnPage.includes(id)));
      setConversationsByUserId((prev) => {
        const next = { ...prev };
        selectedIdsOnPage.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete selected leads');
    } finally {
      setSavingConversation(false);
    }
  }

  function toggleLeadSelection(leadId: number) {
    setSelectedLeadIds((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]));
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedLeadIds((prev) => {
      const offPageIds = prev.filter((id) => !pagedLeadIds.includes(id));
      return checked ? [...offPageIds, ...pagedLeadIds] : offPageIds;
    });
  }

  async function uploadLeadsCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    if (lines.length < 2) {
      throw new Error('CSV must include header and at least one row');
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const payload = lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const rowObj: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowObj[header] = cells[index] ?? '';
      });
      return {
        name: String(rowObj.name || '').trim(),
        email: String(rowObj.email || '').trim(),
        phone: String(rowObj.phone || '').trim() || undefined
      };
    });

    return bulkCreateAdminUsers(payload, {
      leadName: csvUploadForm.leadName.trim(),
      leadFrom: csvUploadForm.leadFrom.trim(),
      leadEntityId: Number(csvUploadForm.leadEntityId)
    });
  }

  async function submitCsvUpload() {
    if (!csvUploadForm.leadName.trim() || !csvUploadForm.leadFrom.trim() || !csvUploadForm.leadEntityId || !csvUploadForm.file) {
      setError('Lead Name, Lead Role, Lead From, and Upload file are required');
      return;
    }
    setUploadingLeads(true);
    try {
      const result = await uploadLeadsCsv(csvUploadForm.file);
      if (result.created.length) {
        setLeads((prev) => [...result.created, ...prev]);
      }
      setIsUploadDialogOpen(false);
      setCsvUploadForm(EMPTY_CSV_UPLOAD_FORM);
      setError(
        result.failedCount
          ? `Imported ${result.createdCount} leads, ${result.failedCount} failed. Check CSV values and duplicates.`
          : `Successfully imported ${result.createdCount} leads.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setUploadingLeads(false);
    }
  }

  function handleCsvInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    setCsvUploadForm((prev) => ({ ...prev, file }));
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
            {isMyBucketView ? 'My Bucket' : 'Leads'}
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Filter by name, email, or phone"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(0);
              }}
            />
            {adminUser?.role === 'admin' ? (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="leads-entity-filter-label">Entity</InputLabel>
                <Select
                  labelId="leads-entity-filter-label"
                  value={entityFilterValue}
                  label="Entity"
                  onChange={(event) => {
                    setEntityFilterValue(event.target.value === 'all' ? 'all' : Number(event.target.value));
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">All Entities</MenuItem>
                  {entities.map((entity) => (
                    <MenuItem key={entity.id} value={entity.id}>
                      {entity.entityName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
            {canManageLeads && !isMyBucketView ? (
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="leads-group-filter-label">Lead Group</InputLabel>
                <Select
                  labelId="leads-group-filter-label"
                  value={leadGroupFilterValue}
                  label="Lead Group"
                  onChange={(event) => {
                    setLeadGroupFilterValue(event.target.value as LeadGroupFilterValue);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="under-process">Under Process</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            ) : null}
            <FormControl size="small" sx={{ minWidth: 210 }}>
              <InputLabel id="leads-status-filter-label">Conversation Status</InputLabel>
              <Select
                labelId="leads-status-filter-label"
                value={statusFilterValue}
                label="Conversation Status"
                onChange={(event) => {
                  setStatusFilterValue(event.target.value as LeadConversationStatus | 'all');
                  setLeadTypeFilterValue('all');
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="leads-type-filter-label">Call Status</InputLabel>
              <Select
                labelId="leads-type-filter-label"
                value={leadTypeFilterValue}
                label="Call Status"
                onChange={(event) => {
                  setLeadTypeFilterValue(event.target.value as 'all' | 'HOT' | 'WARM' | 'COLD' | 'NEW');
                  setStatusFilterValue('all');
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="HOT">Hot</MenuItem>
                <MenuItem value="WARM">Warm</MenuItem>
                <MenuItem value="COLD">Cold</MenuItem>
                <MenuItem value="NEW">New</MenuItem>
              </Select>
            </FormControl>
            <Chip label={loading ? 'Loading...' : `${filteredLeads.length} leads`} color="info" variant="outlined" />
            {canManageLeads ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={removeSelectedLeads}
                disabled={savingConversation || selectedOnPageCount === 0}
              >
                Delete Selected
              </Button>
            ) : null}
            {(adminUser?.role === 'admin' || adminUser?.role === 'manager') ? (
              <Button size="small" variant="outlined" onClick={() => setIsUploadDialogOpen(true)} disabled={uploadingLeads}>
                {uploadingLeads ? 'Uploading...' : 'Upload CSV'}
              </Button>
            ) : null}
            {(adminUser?.role === 'admin' || adminUser?.role === 'manager') ? (
              <Button size="small" variant="contained" onClick={() => setIsAddLeadOpen(true)}>
                Add Lead
              </Button>
            ) : null}
          </Stack>
        </Box>

        <Box className="admin-panel__body">
          {(adminUser?.role === 'admin' || adminUser?.role === 'manager') ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pb: 1 }}>
              CSV columns: `name,email,phone`. Email and phone are optional for leads. Duplicate email/phone rows are skipped during upload.
            </Typography>
          ) : null}
          <AdminDataTable
            tableMinWidth={0}
            tableLayout="fixed"
            headerSx={{
              '& .MuiTableCell-root': {
                whiteSpace: 'normal',
                fontSize: '0.78rem'
              }
            }}
            bodySx={{
              '& .MuiTableCell-root': {
                verticalAlign: 'top',
                whiteSpace: 'normal',
                wordBreak: 'break-word'
              }
            }}
            maxBodyHeight={{
              xs: 'calc(100vh - 300px)',
              md: 'calc(100vh - 260px)'
            }}
            minBodyHeight={{
              xs: 'calc(100vh - 320px)',
              md: 'calc(100vh - 280px)'
            }}
            headerRow={
              <TableRow>
                {canManageLeads ? (
                  <TableCell padding="checkbox" sx={{ width: 52, minWidth: 52 }}>
                    <Checkbox
                      checked={allSelectedOnPage}
                      indeterminate={someSelectedOnPage}
                      onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                      inputProps={{ 'aria-label': 'Select all leads on current page' }}
                    />
                  </TableCell>
                ) : null}
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Call Status</TableCell>
                <TableCell>Conversation Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            }
            bodyRows={
              loading
                ? Array.from({ length: 10 }).map((_, idx) => (
                    <TableRow key={`lead-skeleton-${idx}`}>
                      <TableCell colSpan={canManageLeads ? 7 : 6}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : pagedLeads.map((lead) => {
                    const conversation = conversationsByUserId[lead.id];
                    const effectiveLeadType = getEffectiveLeadType(conversation);
                    const isTakenByCurrentEmployee = Boolean(adminUser?.id) && conversation?.assignedEmployeeUserId === adminUser?.id;
                    const isTakenByOtherEmployee = isEmployeeSession && Boolean(conversation?.assignedEmployeeUserId) && !isTakenByCurrentEmployee;
                    const canManageConversation = !isEmployeeSession || isTakenByCurrentEmployee || isMyBucketView;

                    return (
                      <TableRow hover key={lead.id}>
                        {canManageLeads ? (
                          <TableCell padding="checkbox" sx={{ width: 52, minWidth: 52 }}>
                            <Checkbox
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              inputProps={{ 'aria-label': `Select ${lead.name}` }}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {lead.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{lead.email || '-'}</TableCell>
                        <TableCell>{lead.phone || '-'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={effectiveLeadType} variant="filled" sx={getStatusChipSx(effectiveLeadType)} />
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getLeadTypeColor(effectiveLeadType), flexShrink: 0 }} />
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ minWidth: 140, width: 'auto' }}>
                          <Stack spacing={0.6}>
                            <Chip
                              size="small"
                              label={conversation?.conversationStatus || 'Awaiting Response'}
                              variant="outlined"
                              sx={{ width: 'fit-content', ...getStatusChipSx(effectiveLeadType) }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {isEmployeeSession ? (
                              <Tooltip
                                title={
                                  isTakenByOtherEmployee
                                    ? `${conversation?.assignedEmployee?.name || 'Another employee'} already took this lead`
                                    : isTakenByCurrentEmployee
                                      ? 'Remove from my bucket'
                                      : 'Take this lead'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color={isTakenByCurrentEmployee ? 'success' : 'primary'}
                                    onClick={() => (isTakenByCurrentEmployee ? releaseLead(lead) : takeLead(lead))}
                                    disabled={isTakenByOtherEmployee || takingLeadId === lead.id}
                                  >
                                    {isTakenByCurrentEmployee ? <MoveDownOutlined fontSize="small" /> : <PanToolAltOutlined fontSize="small" />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : null}
                            <Tooltip title="Manage lead conversation">
                              <span>
                                <IconButton size="small" color="primary" onClick={() => openConversationEditor(lead)} disabled={!canManageConversation}>
                                  <ManageAccountsOutlined fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            {canManageLeads ? (
                              <>
                                <Tooltip title="Edit lead">
                                  <IconButton size="small" color="primary" onClick={() => openLeadEditor(lead)}>
                                    <EditOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete lead">
                                  <IconButton size="small" color="error" onClick={() => removeLead(lead)}>
                                    <DeleteOutlineRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
            }
          />
          {!loading ? (
            <TablePagination
              component="div"
              count={filteredLeads.length}
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

      <Drawer
        anchor="right"
        open={Boolean(editingConversationLead)}
        onClose={() => setEditingConversationLead(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 620 },
            maxWidth: '100%'
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 3, py: 2.25 }}>
            <Typography variant="h6" fontWeight={800}>
              Lead Conversation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {editingConversationLead ? `Lead: ${editingConversationLead.name} (${editingConversationLead.email || editingConversationLead.phone || 'No contact'})` : ''}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Name"
                  value={conversationForm.name}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, name: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Phone"
                  value={conversationForm.phone}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, phone: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={conversationForm.email}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, email: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="City"
                  value={conversationForm.city}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, city: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Preferred country"
                  value={conversationForm.preferredCountry}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, preferredCountry: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Program level"
                  value={conversationForm.programLevel}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, programLevel: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Course / field"
                  value={conversationForm.courseField}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, courseField: event.target.value }))}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel id="lead-intake-label">Intake</InputLabel>
                  <Select
                    labelId="lead-intake-label"
                    label="Intake"
                    value={conversationForm.intake}
                    onChange={(event) => setConversationForm((prev) => ({ ...prev, intake: String(event.target.value) }))}
                  >
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="Fall">Fall</MenuItem>
                    <MenuItem value="Spring">Spring</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Budget"
                  value={conversationForm.budget}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, budget: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Source of lead"
                  value={conversationForm.sourceOfLead}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, sourceOfLead: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <TextField
                label="What are they looking for?"
                value={conversationForm.lookingFor}
                onChange={(event) => setConversationForm((prev) => ({ ...prev, lookingFor: event.target.value }))}
                multiline
                minRows={2}
                fullWidth
              />

              <Autocomplete
                fullWidth
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((option) => option.value === conversationForm.conversationStatus) || null}
                onChange={(_event, option) => {
                  if (!option) return;
                  setConversationForm((prev) => ({ ...prev, conversationStatus: option.value }));
                }}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderInput={(params) => <TextField {...(params as any)} label="Conversation Status" placeholder="Type to filter statuses" />}
              />

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700 }}>
                  Call Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: getLeadTypeColor(getLeadTypeFromStatus(conversationForm.conversationStatus)) }} />
                  <Typography variant="body2" color="text.secondary">
                    Auto-set from selected conversation status
                  </Typography>
                </Box>
              </Box>

              <TextField
                label="Conversation notes"
                value={conversationForm.notes}
                onChange={(event) => setConversationForm((prev) => ({ ...prev, notes: event.target.value }))}
                multiline
                minRows={3}
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Reminder"
                  type="datetime-local"
                  value={conversationForm.reminderAt}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, reminderAt: event.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Last contacted"
                  type="datetime-local"
                  value={conversationForm.lastContactedAt}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, lastContactedAt: event.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel id="lead-reminder-done-label">Reminder Status</InputLabel>
                <Select
                  labelId="lead-reminder-done-label"
                  label="Reminder Status"
                  value={conversationForm.reminderDone ? 'done' : 'pending'}
                  onChange={(event) => setConversationForm((prev) => ({ ...prev, reminderDone: event.target.value === 'done' }))}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
            <Button onClick={() => setEditingConversationLead(null)} color="inherit">
              Cancel
            </Button>
            <Button variant="contained" onClick={saveConversation} disabled={savingConversation || !editingConversationLead}>
              {savingConversation ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Dialog fullWidth maxWidth="sm" open={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)}>
        <DialogTitle>Add Lead</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={leadForm.name} onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))} fullWidth />
            <TextField label="Email" type="email" value={leadForm.email} onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))} fullWidth />
            <TextField label="Phone" value={leadForm.phone} onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))} fullWidth />
            <TextField label="City" value={leadForm.city} onChange={(event) => setLeadForm((prev) => ({ ...prev, city: event.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddLeadOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={addLead} variant="contained" disabled={creatingLead}>
            {creatingLead ? 'Adding...' : 'Add Lead'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" open={Boolean(editingLead)} onClose={() => setEditingLead(null)}>
        <DialogTitle>Edit Lead</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={editLeadForm.name} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, name: event.target.value }))} fullWidth />
            <TextField label="Email" type="email" value={editLeadForm.email} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, email: event.target.value }))} fullWidth />
            <TextField label="Phone" value={editLeadForm.phone} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, phone: event.target.value }))} fullWidth />
            <TextField label="City" value={editLeadForm.city} onChange={(event) => setEditLeadForm((prev) => ({ ...prev, city: event.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingLead(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={saveLeadEdit} variant="contained" disabled={updatingLead}>
            {updatingLead ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" open={isUploadDialogOpen} onClose={() => setIsUploadDialogOpen(false)}>
        <DialogTitle>Upload Leads CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Lead Name"
              value={csvUploadForm.leadName}
              onChange={(event) => setCsvUploadForm((prev) => ({ ...prev, leadName: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="lead-role-label">Lead Role</InputLabel>
              <Select
                labelId="lead-role-label"
                label="Lead Role"
                value={csvUploadForm.leadEntityId}
                onChange={(event) =>
                  setCsvUploadForm((prev) => ({
                    ...prev,
                    leadEntityId: Number(event.target.value)
                  }))
                }
              >
                {entities.map((entity) => (
                  <MenuItem key={entity.id} value={entity.id}>
                    {entity.entityName} ({entity.entityRoleLabel})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Lead From"
              value={csvUploadForm.leadFrom}
              onChange={(event) => setCsvUploadForm((prev) => ({ ...prev, leadFrom: event.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleCsvInputChange} />
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>
                Upload file
              </Button>
              <Typography variant="body2" color="text.secondary">
                {csvUploadForm.file?.name || 'No file selected'}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUploadDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={submitCsvUpload} variant="contained" disabled={uploadingLeads}>
            {uploadingLeads ? 'Uploading...' : 'Upload CSV'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
