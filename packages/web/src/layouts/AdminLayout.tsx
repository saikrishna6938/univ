import AppsRounded from '@mui/icons-material/AppsRounded';
import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import SchoolRounded from '@mui/icons-material/SchoolRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import EventRounded from '@mui/icons-material/EventRounded';
import { AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  nested?: boolean;
  roles?: Array<'admin' | 'manager' | 'employee'>;
};

const drawerWidth = 278;

export default function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, logout } = useAdminAuth();

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        label: 'Dashboard',
        to: '/admin/dashboard',
        icon: <DashboardRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Users',
        to: '/admin/users',
        icon: <GroupRounded fontSize="small" />,
        roles: ['admin', 'manager', 'employee']
      },
      {
        label: 'Programs Manager',
        to: '/admin/programs',
        icon: <SchoolRounded fontSize="small" />,
        roles: ['admin', 'manager']
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
        label: 'Tasks',
        to: '/admin/tasks',
        icon: <ChecklistRounded fontSize="small" />,
        roles: ['employee']
      }
    ],
    []
  );

  const visibleNavItems = useMemo(() => {
    const role = adminUser?.role;
    return navItems.filter((item) => {
      if (!item.roles || !role) return true;
      return item.roles.includes(role);
    });
  }, [adminUser?.role, navItems]);

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
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
      <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.2)' }} />
      <List sx={{ p: 1.5 }}>
        {visibleNavItems.map((item) => {
          const selected = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                mb: 0.75,
                borderRadius: 2,
                ml: item.nested ? 1.5 : 0,
                pl: item.nested ? 3 : 1.5,
                bgcolor: selected ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.16)' }
              }}
            >
              <ListItemIcon sx={{ color: selected ? '#67e8f9' : '#cbd5e1', minWidth: 34 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 500, color: selected ? '#f8fafc' : '#e2e8f0' }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ px: 2.5, mt: 'auto', pb: 3 }}>
        <Chip icon={<AppsRounded />} label="Theme-ready UI" sx={{ bgcolor: 'rgba(148, 163, 184, 0.14)', color: '#cbd5e1' }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
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
          <Chip label={adminUser?.role ?? 'admin'} color="info" variant="outlined" />
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

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
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
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '72px'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
