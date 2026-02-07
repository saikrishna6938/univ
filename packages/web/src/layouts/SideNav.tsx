import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { useLayout } from './LayoutContext';

const navItems: { to: string; label: string; icon: ReactElement }[] = [
  { to: '/', label: 'Home', icon: <HomeOutlined /> },
  { to: '/programs', label: 'Programs', icon: <SchoolOutlined /> },
  { to: '/apply', label: 'Apply', icon: <AssignmentTurnedInOutlined /> }
];

export default function SideNav() {
  const { drawerOpen, closeDrawer } = useLayout();

  const drawer = (
    <>
      <div className="sidenav-brand">
        <span className="brand-mark">GW</span>
        <span className="brand-text">Gradwalk</span>
      </div>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={closeDrawer}
            selected={location.pathname === item.to}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Drawer
      variant="temporary"
      open={drawerOpen}
      onClose={closeDrawer}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: 'block', lg: 'none' },
        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 }
      }}
    >
      {drawer}
    </Drawer>
  );
}
