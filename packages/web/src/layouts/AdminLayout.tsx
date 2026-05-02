import AppsRounded from '@mui/icons-material/AppsRounded';
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded';
import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import InboxRounded from '@mui/icons-material/InboxRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import MenuOpenRounded from '@mui/icons-material/MenuOpenRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import SchoolRounded from '@mui/icons-material/SchoolRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import EventRounded from '@mui/icons-material/EventRounded';
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import QuizRounded from '@mui/icons-material/QuizRounded';
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import FiberManualRecordRounded from '@mui/icons-material/FiberManualRecordRounded';
import { Alert, AppBar, Avatar, Badge, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import { fetchAdminUsers, fetchLeadConversations } from '../lib/api';
import { formatLocalDateTime, isPendingReminderFollowUp, isPendingReminderOverdue, parseLocalDateTime } from '../lib/datetime';

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  nested?: boolean;
  roles?: string[];
  adminMasterAccess?: boolean;
};

const drawerWidth = 278;
const drawerCollapsedWidth = 84;
const REMINDER_DISMISSED_KEY = 'admin_reminder_notifications_dismissed';

type ReminderNotification = {
  key: string;
  conversationId: number;
  userId: number;
  leadName: string;
  message: string;
  reminderAt: string;
};

const ACTIVE_BUCKET_STATUSES = new Set([
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

const UNDER_PROCESS_BUCKET_STATUSES = new Set([
  'Connected',
  'Service not available',
  'Call Not Answered',
  'Call Disconnected',
  'Switched Off',
  'Number Busy',
  'WhatsApp Sent',
  'Left Voicemail'
]);

const CLOSED_BUCKET_STATUSES = new Set([
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

function playReminderSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 500);
  } catch {
    // Browser may block audio before user interaction.
  }
}

export default function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, logout } = useAdminAuth();
  const [leadNavItems, setLeadNavItems] = useState<Array<{ key: string; label: string; count: number }>>([]);
  const [leadNavCount, setLeadNavCount] = useState(0);
  const [myBucketNavCount, setMyBucketNavCount] = useState(0);
  const [myBucketStatusCounts, setMyBucketStatusCounts] = useState({ active: 0, underProcess: 0, closed: 0, followUp: 0, overdue: 0 });
  const [reminderNotifications, setReminderNotifications] = useState<ReminderNotification[]>([]);
  const [dismissedReminderKeys, setDismissedReminderKeys] = useState<string[]>([]);
  const [dismissedToastKeys, setDismissedToastKeys] = useState<string[]>([]);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
  const announcedReminderKeysRef = useRef<Set<string>>(new Set());
  const hasAdminMasterAccess = useMemo(() => {
    const roleTypes = (adminUser?.roleTypes || []).map((roleType) => String(roleType || '').trim().toLowerCase());
    return adminUser?.role === 'admin' || roleTypes.includes('admin') || roleTypes.includes('superadmin');
  }, [adminUser?.role, adminUser?.roleTypes]);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        label: 'Dashboard',
        to: '/admin/dashboard',
        icon: <DashboardRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Roles',
        to: '/admin/roles',
        icon: <AdminPanelSettingsRounded fontSize="small" />,
        adminMasterAccess: true
      },
      {
        label: 'Entities',
        to: '/admin/entities',
        icon: <AccountTreeRounded fontSize="small" />,
        adminMasterAccess: true
      },
      {
        label: 'Leads',
        to: '/admin/leads',
        icon: <GroupRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'My Bucket',
        to: '/admin/leads?view=my-bucket',
        icon: <InboxRounded fontSize="small" />,
        roles: ['employee']
      },
      {
        label: 'Active',
        to: '/admin/leads?view=my-bucket&bucketStatus=active',
        icon: <FiberManualRecordRounded sx={{ fontSize: 8 }} />,
        nested: true,
        roles: ['employee']
      },
      {
        label: 'Under Process',
        to: '/admin/leads?view=my-bucket&bucketStatus=under-process',
        icon: <FiberManualRecordRounded sx={{ fontSize: 8 }} />,
        nested: true,
        roles: ['employee']
      },
      {
        label: 'Closed',
        to: '/admin/leads?view=my-bucket&bucketStatus=closed',
        icon: <FiberManualRecordRounded sx={{ fontSize: 8 }} />,
        nested: true,
        roles: ['employee']
      },
      {
        label: 'Follow Up',
        to: '/admin/leads?view=my-bucket&bucketStatus=follow-up',
        icon: <FiberManualRecordRounded sx={{ fontSize: 8 }} />,
        nested: true,
        roles: ['employee']
      },
      {
        label: 'Overdue',
        to: '/admin/leads?view=my-bucket&bucketStatus=overdue',
        icon: <FiberManualRecordRounded sx={{ fontSize: 8 }} />,
        nested: true,
        roles: ['employee']
      },
      {
        label: 'Users',
        to: '/admin/users',
        icon: <GroupRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Tasks',
        to: '/admin/tasks',
        icon: <ChecklistRounded fontSize="small" />,
        roles: ['employee']
      },
      {
        label: 'Programs Manager',
        to: '/admin/programs',
        icon: <SchoolRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Featured Universities',
        to: '/admin/featured-universities',
        icon: <StarRounded fontSize="small" />,
        roles: ['admin', 'manager']
      },
      {
        label: 'Events',
        to: '/admin/events',
        icon: <EventRounded fontSize="small" />,
        roles: ['admin', 'manager']
      },
      {
        label: 'Scholarships',
        to: '/admin/scholarships',
        icon: <WorkspacePremiumRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Study Guides',
        to: '/admin/study-guides',
        icon: <AutoStoriesRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Exams',
        to: '/admin/exams',
        icon: <QuizRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
    ],
    []
  );

  const visibleNavItems = useMemo(() => {
    const role = adminUser?.role;
    return navItems.filter((item) => {
      if (item.adminMasterAccess) {
        return hasAdminMasterAccess;
      }
      if (!item.roles || !role) return true;
      return item.roles.includes(role);
    });
  }, [adminUser?.role, hasAdminMasterAccess, navItems]);

  useEffect(() => {
    let mounted = true;

    async function loadLeadNavItems() {
      if (!adminUser || !['admin', 'manager', 'employee'].includes(adminUser.role)) {
        setLeadNavItems([]);
        setLeadNavCount(0);
        setMyBucketNavCount(0);
        setMyBucketStatusCounts({ active: 0, underProcess: 0, closed: 0, followUp: 0, overdue: 0 });
        return;
      }

      try {
        const viewerRoles =
          adminUser.role === 'admin'
            ? undefined
            : (adminUser.roles || [adminUser.role]).map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
        const [leads, conversations] = await Promise.all([
          fetchAdminUsers('leads', { viewerRoles }),
          fetchLeadConversations('leads')
        ]);
        if (!mounted) return;
        const conversationsByUserId = new Map(conversations.map((conversation) => [conversation.userId, conversation]));
        const visibleLeadIds = new Set(leads.map((lead) => lead.id));
        const visibleLeads =
          adminUser.role === 'employee'
            ? leads.filter((lead) => conversationsByUserId.get(lead.id)?.assignedEmployeeUserId !== adminUser.id)
            : leads;
        const myBucketConversations =
          adminUser.role === 'employee'
            ? conversations.filter(
                (conversation) => conversation.assignedEmployeeUserId === adminUser.id && visibleLeadIds.has(conversation.userId)
              )
            : [];
        const groupedLeadMap = new Map<string, { key: string; label: string; count: number }>();
        visibleLeads.forEach((lead) => {
          const label = String(lead.leadName || '').trim();
          if (!label) return;
          const key = label.toLowerCase();
          const current = groupedLeadMap.get(key);
          if (current) current.count += 1;
          else groupedLeadMap.set(key, { key, label, count: 1 });
        });
        const groupedLeadNames = Array.from(groupedLeadMap.values());
        const visibleLeadCount = visibleLeads.length;
        const myBucketCount = myBucketConversations.length;
        const statusCounts = myBucketConversations.reduce(
          (acc, conversation) => {
            const status = conversation.conversationStatus || 'Awaiting Response';
            if (ACTIVE_BUCKET_STATUSES.has(status)) acc.active += 1;
            else if (UNDER_PROCESS_BUCKET_STATUSES.has(status)) acc.underProcess += 1;
            else if (CLOSED_BUCKET_STATUSES.has(status)) acc.closed += 1;
            if (isPendingReminderFollowUp(conversation.reminderAt, conversation.reminderDone)) acc.followUp += 1;
            if (isPendingReminderOverdue(conversation.reminderAt, conversation.reminderDone)) acc.overdue += 1;
            return acc;
          },
          { active: 0, underProcess: 0, closed: 0, followUp: 0, overdue: 0 }
        );
        setLeadNavItems(groupedLeadNames);
        setLeadNavCount(visibleLeadCount);
        setMyBucketNavCount(myBucketCount);
        setMyBucketStatusCounts(statusCounts);
      } catch {
        if (!mounted) return;
        setLeadNavItems([]);
        setLeadNavCount(0);
        setMyBucketNavCount(0);
        setMyBucketStatusCounts({ active: 0, underProcess: 0, closed: 0, followUp: 0, overdue: 0 });
      }
    }

    loadLeadNavItems();
    const intervalId = window.setInterval(loadLeadNavItems, 15_000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [adminUser?.id, adminUser?.role, adminUser?.roles, location.pathname, location.search]);

  useEffect(() => {
    if (!adminUser) {
      setDismissedReminderKeys([]);
      return;
    }
    const raw = localStorage.getItem(`${REMINDER_DISMISSED_KEY}:${adminUser.id}`);
    setDismissedReminderKeys(raw ? (JSON.parse(raw) as string[]) : []);
  }, [adminUser]);

  useEffect(() => {
    if (!adminUser) return;
    localStorage.setItem(`${REMINDER_DISMISSED_KEY}:${adminUser.id}`, JSON.stringify(dismissedReminderKeys));
  }, [adminUser, dismissedReminderKeys]);

  useEffect(() => {
    let mounted = true;

    async function loadReminderNotifications() {
      if (!adminUser || !['admin', 'manager', 'employee'].includes(adminUser.role)) {
        setReminderNotifications([]);
        return;
      }

      try {
        const viewerRoles =
          adminUser.role === 'admin'
            ? undefined
            : (adminUser.roles || [adminUser.role]).map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
        const [leads, conversations] = await Promise.all([
          fetchAdminUsers('leads', { viewerRoles }),
          fetchLeadConversations('leads')
        ]);
        if (!mounted) return;

        const visibleLeadIds = new Set(leads.map((lead) => lead.id));
        const now = Date.now();
        const notifications = conversations
          .filter((conversation) => {
            if (!visibleLeadIds.has(conversation.userId)) return false;
            if (conversation.assignedEmployeeUserId !== adminUser.id) return false;
            if (!conversation.reminderAt || conversation.reminderDone) return false;
            const reminderTime = parseLocalDateTime(conversation.reminderAt).getTime();
            return !Number.isNaN(reminderTime) && reminderTime <= now;
          })
          .map((conversation) => {
            const lead = leads.find((item) => item.id === conversation.userId);
            const leadName = conversation.user?.name || lead?.name || 'Lead';
            return {
              key: `${conversation.id}:${conversation.reminderAt}`,
              conversationId: conversation.id,
              userId: conversation.userId,
              leadName,
              message: `Reminder due for ${leadName}`,
              reminderAt: String(conversation.reminderAt)
            };
          })
          .filter((item) => !dismissedReminderKeys.includes(item.key))
          .sort((a, b) => parseLocalDateTime(b.reminderAt).getTime() - parseLocalDateTime(a.reminderAt).getTime());

        const newKeys = notifications.filter((item) => !announcedReminderKeysRef.current.has(item.key)).map((item) => item.key);
        if (newKeys.length) {
          playReminderSound();
          newKeys.forEach((key) => announcedReminderKeysRef.current.add(key));
        }

        setReminderNotifications(notifications);
      } catch {
        if (!mounted) return;
        setReminderNotifications([]);
      }
    }

    loadReminderNotifications();
    const intervalId = window.setInterval(loadReminderNotifications, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [adminUser, dismissedReminderKeys]);

  function dismissReminder(key: string) {
    setDismissedReminderKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setReminderNotifications((prev) => prev.filter((item) => item.key !== key));
    setDismissedToastKeys((prev) => prev.filter((item) => item !== key));
  }

  function hideReminderToast(key: string) {
    setDismissedToastKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: '#e2e8f0',
        background: 'linear-gradient(180deg, #0f172a 0%, #111827 45%, #1f2937 100%)'
      }}
    >
      <Box sx={{ p: sidebarCollapsed ? 1.5 : 3, display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', gap: 1.5 }}>
        {!sidebarCollapsed ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#0ea5e9', fontWeight: 700 }}>GW</Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} lineHeight={1.1}>
                Admin Studio
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Gradwalk operations
              </Typography>
            </Box>
          </Box>
        ) : (
          <Avatar sx={{ bgcolor: '#0ea5e9', fontWeight: 700 }}>GW</Avatar>
        )}
        {!isMobile ? (
          <Tooltip title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton
              size="small"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              sx={{ color: '#cbd5e1', ml: sidebarCollapsed ? 0 : 1 }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <MenuRounded fontSize="small" /> : <MenuOpenRounded fontSize="small" />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
      <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }} />
      <List sx={{ p: 1.5 }}>
        {visibleNavItems.map((item) => {
          const selected =
            location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`) ||
            `${location.pathname}${location.search}` === item.to;
          const isLeadsRoot = item.to === '/admin/leads';
          const navCount =
            item.to === '/admin/leads'
              ? leadNavCount
              : item.to === '/admin/leads?view=my-bucket'
                ? myBucketNavCount
                : item.to === '/admin/leads?view=my-bucket&bucketStatus=active'
                  ? myBucketStatusCounts.active
                  : item.to === '/admin/leads?view=my-bucket&bucketStatus=under-process'
                    ? myBucketStatusCounts.underProcess
                    : item.to === '/admin/leads?view=my-bucket&bucketStatus=closed'
                      ? myBucketStatusCounts.closed
                      : item.to === '/admin/leads?view=my-bucket&bucketStatus=follow-up'
                        ? myBucketStatusCounts.followUp
                        : item.to === '/admin/leads?view=my-bucket&bucketStatus=overdue'
                          ? myBucketStatusCounts.overdue
                      : null;

          return (
            <Box key={item.to}>
              <ListItemButton
                component={RouterLink}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                sx={{
                  mb: 0.75,
                  borderRadius: 2,
                  ml: item.nested ? 1.5 : 0,
                  pl: sidebarCollapsed ? 1 : item.nested ? 3 : 1.5,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  bgcolor: selected ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.16)' }
                }}
              >
                <ListItemIcon sx={{ color: selected ? '#67e8f9' : '#cbd5e1', minWidth: sidebarCollapsed ? 0 : 34, mr: sidebarCollapsed ? 0 : undefined }}>{item.icon}</ListItemIcon>
                {!sidebarCollapsed ? (
                  <>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: selected ? 700 : 500, color: selected ? '#f8fafc' : '#e2e8f0' }}
                    />
                    {navCount !== null ? (
                      <Chip
                        size="small"
                        label={navCount}
                        sx={{
                          height: 22,
                          minWidth: 28,
                          bgcolor: selected ? 'rgba(103, 232, 249, 0.18)' : 'rgba(148, 163, 184, 0.14)',
                          color: selected ? '#67e8f9' : '#cbd5e1',
                          fontWeight: 700,
                          '& .MuiChip-label': { px: 0.9 }
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </ListItemButton>
              {isLeadsRoot && !sidebarCollapsed ? (
                <Box sx={{ ml: 1.5, mb: 1 }}>
                  {leadNavItems.filter((lead) => lead.count > 0).map((lead) => {
                    const leadTo = `/admin/leads?leadName=${encodeURIComponent(lead.label)}`;
                    const leadSelected = `${location.pathname}${location.search}` === leadTo;
                    return (
                      <ListItemButton
                        key={lead.key}
                        component={RouterLink}
                        to={leadTo}
                        onClick={() => setMobileOpen(false)}
                        sx={{
                          mb: 0.5,
                          borderRadius: 2,
                          pl: 3,
                          py: 0.5,
                          bgcolor: leadSelected ? 'rgba(14, 165, 233, 0.16)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.12)' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 22, color: leadSelected ? '#67e8f9' : '#94a3b8' }}>
                          <FiberManualRecordRounded sx={{ fontSize: 8 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={lead.label}
                          primaryTypographyProps={{
                            noWrap: true,
                            fontSize: '0.85rem',
                            fontWeight: leadSelected ? 700 : 500,
                            color: leadSelected ? '#f8fafc' : '#cbd5e1'
                          }}
                        />
                        <Chip
                          size="small"
                          label={String(lead.count)}
                          sx={{
                            height: 20,
                            minWidth: 24,
                            flexShrink: 0,
                            bgcolor: leadSelected ? 'rgba(103, 232, 249, 0.18)' : 'rgba(148, 163, 184, 0.14)',
                            color: leadSelected ? '#67e8f9' : '#cbd5e1',
                            fontWeight: 700,
                            '& .MuiChip-label': { px: 0.7 }
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </Box>
              ) : null}
            </Box>
          );
        })}
      </List>
      {!sidebarCollapsed ? (
        <Box sx={{ px: 2.5, mt: 'auto', pb: 3 }}>
          <Chip icon={<AppsRounded />} label="Theme-ready UI" sx={{ bgcolor: 'rgba(148, 163, 184, 0.14)', color: '#cbd5e1' }} />
        </Box>
      ) : null}
    </Box>
  );

  const effectiveDrawerWidth = isMobile ? drawerWidth : sidebarCollapsed ? drawerCollapsedWidth : drawerWidth;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${effectiveDrawerWidth}px)` },
          ml: { md: `${effectiveDrawerWidth}px` },
          borderBottom: '1px solid #e2e8f0',
          bgcolor: 'rgba(248, 250, 252, 0.9)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen((prev) => !prev)} sx={{ display: { md: 'none' } }}>
            <MenuRounded />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Admin Panel
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
              University Applications Dashboard
            </Typography>
          </Box>
          <Tooltip title="Reminder notifications">
            <IconButton color="inherit" onClick={(event) => setNotificationAnchorEl(event.currentTarget)}>
              <Badge color="error" badgeContent={reminderNotifications.length} max={99}>
                <NotificationsRounded />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationAnchorEl}
            open={Boolean(notificationAnchorEl)}
            onClose={() => setNotificationAnchorEl(null)}
            PaperProps={{ sx: { width: 360, maxWidth: 'calc(100vw - 32px)' } }}
          >
            {reminderNotifications.length === 0 ? (
              <MenuItem disabled>No reminder notifications</MenuItem>
            ) : (
              reminderNotifications.map((notification) => (
                <MenuItem key={notification.key} sx={{ whiteSpace: 'normal', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatLocalDateTime(notification.reminderAt)}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => dismissReminder(notification.key)}>
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))
            )}
          </Menu>
          <Chip label={adminUser?.name || 'Admin User'} color="info" variant="outlined" />
          <Button
            startIcon={<LogoutRounded />}
            color="inherit"
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: effectiveDrawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: effectiveDrawerWidth,
              boxSizing: 'border-box',
              borderRight: 'none'
            }
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${effectiveDrawerWidth}px)` },
          mt: '72px'
        }}
      >
        <Outlet />
      </Box>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1400,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          width: { xs: 'calc(100vw - 32px)', sm: 360 }
        }}
      >
        {reminderNotifications.filter((notification) => !dismissedToastKeys.includes(notification.key)).slice(0, 3).map((notification) => (
          <Alert
            key={notification.key}
            severity="warning"
            action={
              <IconButton size="small" color="inherit" onClick={() => hideReminderToast(notification.key)}>
                <CloseRounded fontSize="small" />
              </IconButton>
            }
            sx={{ boxShadow: '0 14px 34px rgba(15, 23, 42, 0.18)' }}
          >
            <Typography variant="body2" fontWeight={700}>
              {notification.message}
            </Typography>
            <Typography variant="caption">
              {formatLocalDateTime(notification.reminderAt)}
            </Typography>
          </Alert>
        ))}
      </Box>
    </Box>
  );
}
