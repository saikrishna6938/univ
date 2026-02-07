import MenuRounded from '@mui/icons-material/MenuRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import logoImg from '../assets/logo/logo.png';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { LayoutProvider, useLayout } from './LayoutContext';
import { CountryProvider } from './CountryContext';
import CountrySelector from './CountrySelector';
import SearchBar from './SearchBar';
import LoginPopover from './LoginPopover';
import { AuthProvider, useAuth } from './AuthContext';
import UserMenu from './UserMenu';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import SideNav from './SideNav';
import NewsletterBar from '../components/NewsletterBar';
import './MainLayout.css';

type Props = { children: ReactNode };

function Header() {
  const { toggleDrawer } = useLayout();
  const { user } = useAuth();
  return (
    <AppBar position="sticky" elevation={6} color="inherit" className="layout-appbar">
      <Toolbar disableGutters>
        <Container maxWidth={false} className="layout-header__inner">
          <IconButton edge="start" color="inherit" aria-label="menu" className="nav-toggle" onClick={toggleDrawer}>
            <MenuRounded />
          </IconButton>
          <Link component={RouterLink} to="/" underline="none" color="inherit" className="brand">
            <img src={logoImg} alt="Gradwalk" style={{ height: 36, background: '#fff', borderRadius: 6, padding: '4px 6px' }} />
          </Link>
          <nav className="main-nav" />
          <div className="header-actions">
            <LocationOnOutlined sx={{ color: '#e2e8f0' }} />
            <CountrySelector />
            <SearchBar />
            {user ? <UserMenu /> : <LoginPopover />}
          </div>
        </Container>
      </Toolbar>
    </AppBar>
  );
}

function Footer() {
  return (
    <footer className="layout-footer">
      <NewsletterBar />
      <Container maxWidth="lg" className="layout-footer__inner">
        <div>
          <div className="brand brand--muted">
            <span className="brand-mark">GW</span>
            <span className="brand-text">Gradwalk</span>
          </div>
          <Typography variant="body2" color="inherit" className="footer-copy">
            Find the right course, apply in minutes, track everything in one place.
          </Typography>
        </div>
        <div className="footer-links">
          <Link component={RouterLink} to="/programs" color="inherit" underline="hover">
            Programs
          </Link>
          <Link component={RouterLink} to="/apply" color="inherit" underline="hover">
            Apply
          </Link>
          <Link href="#top" color="inherit" underline="hover">
            Back to top
          </Link>
        </div>
      </Container>
      <Divider />
      <Box textAlign="center" py={2} color="inherit">
        <Typography variant="caption">© {new Date().getFullYear()} Gradwalk. All rights reserved.</Typography>
      </Box>
    </footer>
  );
}

export default function MainLayout({ children }: Props) {
  const location = useLocation();
  return (
    <AuthProvider>
      <CountryProvider>
        <LayoutProvider>
          <div className="layout-shell">
            <Header />
            <SideNav />
            <main className="layout-content">
              <Container maxWidth="lg" sx={{ mt: location.pathname === '/' ? 0 : 2 }}>
                {children}
              </Container>
            </main>
            <Footer />
          </div>
        </LayoutProvider>
      </CountryProvider>
    </AuthProvider>
  );
}
