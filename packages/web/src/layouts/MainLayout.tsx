import MenuRounded from '@mui/icons-material/MenuRounded';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import logoImg from '../assets/logo/logo.png';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutProvider, useLayout } from './LayoutContext';
import { CountryProvider, useCountry } from './CountryContext';
import CountrySelector from './CountrySelector';
import SearchBar from './SearchBar';
import LoginPopover from './LoginPopover';
import { AuthProvider, useAuth } from './AuthContext';
import UserMenu from './UserMenu';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import SideNav from './SideNav';
import NewsletterBar from '../components/NewsletterBar';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  fetchConcentrations,
  fetchExams,
  fetchScholarships,
  fetchStudyGuides,
  fetchUniversities,
  type ConcentrationItem,
  type ExamItem,
  type ScholarshipItem,
  type StudyGuideItem,
  type UniversityItem
} from '../components/find-course/api';
import './MainLayout.css';

type Props = { children: ReactNode };
type DesktopCategory = 'Courses' | 'Colleges' | 'Scholarships' | 'Study Guide' | 'Exams';
const FETCH_ACTIVITY_EVENT = 'gw:fetch-activity';

function initGlobalFetchTracker() {
  if (typeof window === 'undefined') return;

  const trackerWindow = window as Window & {
    __gwFetchPatched?: boolean;
    __gwFetchInFlight?: number;
    __gwNativeFetch?: typeof fetch;
  };

  if (trackerWindow.__gwFetchPatched) return;

  trackerWindow.__gwFetchPatched = true;
  trackerWindow.__gwFetchInFlight = trackerWindow.__gwFetchInFlight || 0;
  trackerWindow.__gwNativeFetch = trackerWindow.fetch.bind(window);

  window.fetch = async (...args) => {
    trackerWindow.__gwFetchInFlight = (trackerWindow.__gwFetchInFlight || 0) + 1;
    window.dispatchEvent(
      new CustomEvent(FETCH_ACTIVITY_EVENT, { detail: trackerWindow.__gwFetchInFlight })
    );
    try {
      return await trackerWindow.__gwNativeFetch!(...args);
    } finally {
      trackerWindow.__gwFetchInFlight = Math.max(
        0,
        (trackerWindow.__gwFetchInFlight || 1) - 1
      );
      window.dispatchEvent(
        new CustomEvent(FETCH_ACTIVITY_EVENT, { detail: trackerWindow.__gwFetchInFlight })
      );
    }
  };
}

function DesktopSubHeader({
  collapsed,
  onToggleCollapse
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { countries, setSelectedCountryId } = useCountry();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const [treeCountryId, setTreeCountryId] = useState<string | null>(null);
  const [treeCategory, setTreeCategory] = useState<DesktopCategory | null>(null);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<ConcentrationItem[]>([]);
  const [colleges, setColleges] = useState<UniversityItem[]>([]);
  const [scholarships, setScholarships] = useState<ScholarshipItem[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuideItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);

  useEffect(() => {
    let active = true;
    if (!isDesktop || !treeCountryId || !treeCategory) return;

    setLoading(true);
    setError(null);

    const request =
      treeCategory === 'Courses'
        ? fetchConcentrations(treeCountryId).then((rows) => {
            if (!active) return;
            setCourses(rows);
          })
        : treeCategory === 'Colleges'
          ? fetchUniversities(treeCountryId).then((rows) => {
              if (!active) return;
              setColleges(rows);
            })
          : treeCategory === 'Scholarships'
            ? fetchScholarships(treeCountryId).then((rows) => {
                if (!active) return;
                setScholarships(rows);
              })
            : treeCategory === 'Study Guide'
              ? fetchStudyGuides({ countryId: treeCountryId }).then((rows) => {
                  if (!active) return;
                  setStudyGuides(rows);
                })
              : fetchExams(treeCountryId).then((rows) => {
                  if (!active) return;
                  setExams(rows);
                });

    request
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [treeCategory, treeCountryId, isDesktop]);

  const categoryOptions: DesktopCategory[] = ['Courses', 'Colleges', 'Scholarships', 'Study Guide', 'Exams'];

  const quickItems = useMemo(() => {
    if (treeCategory === 'Courses') {
      return courses
        .map((item) => item.concentrationName || item.concentration || '')
        .filter(Boolean)
        .slice(0, 20);
    }
    if (treeCategory === 'Colleges') {
      const term = collegeSearch.trim().toLowerCase();
      const filtered = colleges
        .map((item) => item.universityName)
        .filter(Boolean)
        .filter((name) => !term || name.toLowerCase().includes(term));
      return filtered.slice(0, 20);
    }
    if (treeCategory === 'Scholarships') {
      return scholarships.map((item) => item.name).filter(Boolean).slice(0, 20);
    }
    if (treeCategory === 'Study Guide') {
      return studyGuides.map((item) => item.title).filter(Boolean).slice(0, 20);
    }
    return exams.map((item) => item.name).filter(Boolean).slice(0, 20);
  }, [treeCategory, collegeSearch, colleges, courses, exams, scholarships, studyGuides]);

  function onQuickItemClick(label: string) {
    if (!treeCountryId || !treeCategory) return;
    let navigated = false;
    if (treeCategory === 'Courses') {
      const params = new URLSearchParams();
      params.set('country', treeCountryId);
      params.set('concentration', label);
      navigate(`/find-course?${params.toString()}`);
      navigated = true;
    } else if (treeCategory === 'Colleges') {
      const params = new URLSearchParams();
      params.set('country', treeCountryId);
      params.set('university', label);
      navigate(`/find-course?${params.toString()}`);
      navigated = true;
    } else if (treeCategory === 'Scholarships') {
      const target = scholarships.find((item) => item.name === label);
      if (target) {
        navigate(`/scholarships/${target.id}`);
        navigated = true;
      }
    } else if (treeCategory === 'Study Guide') {
      const target = studyGuides.find((item) => item.title === label);
      if (target) {
        navigate(`/study-guides/${target.id}`);
        navigated = true;
      }
    } else {
      const target = exams.find((item) => item.name === label);
      if (target) {
        navigate(`/exams/${target.id}`);
        navigated = true;
      }
    }
    if (navigated && !collapsed) {
      onToggleCollapse();
    }
  }

  if (!isDesktop) return null;

  return (
    <div className="desktop-subheader">
      <IconButton
        color="inherit"
        className="desktop-subheader__toggle-btn"
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand sub header' : 'Collapse sub header'}
      >
        {collapsed ? <UnfoldMoreRounded /> : <UnfoldLessRounded />}
      </IconButton>
      <div className="desktop-subheader__row">
        <span className="desktop-subheader__label">Countries</span>
        <div className="desktop-subheader__scroller">
          {countries.map((country) => {
            const id = (country.id ?? country._id)?.toString();
            const active = id === treeCountryId;
            return (
              <button
                key={id || country.name}
                type="button"
                className={`desktop-subheader__pill ${active ? 'is-active' : ''}`}
                onClick={() => {
                  if (!id) return;
                  if (collapsed) onToggleCollapse();
                  setTreeCountryId(id);
                  setSelectedCountryId(id);
                  setTreeCategory(null);
                  setCollegeSearch('');
                }}
              >
                {country.name}
              </button>
            );
          })}
        </div>
      </div>

      {!collapsed && treeCountryId ? (
        <div className="desktop-subheader__row">
          <span className="desktop-subheader__label">Category</span>
          <div className="desktop-subheader__scroller">
            {categoryOptions.map((item) => (
              <button
                key={item}
                type="button"
                className={`desktop-subheader__pill ${treeCategory === item ? 'is-active' : ''}`}
                onClick={() => {
                  setTreeCategory(item);
                  setCollegeSearch('');
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : !collapsed ? (
        <div className="desktop-subheader__row">
          <span className="desktop-subheader__label">Category</span>
          <div className="desktop-subheader__scroller">
            <span className="desktop-subheader__hint">Select a country to continue</span>
          </div>
        </div>
      ) : null}

      {!collapsed && treeCountryId && treeCategory ? (
        <>
          {treeCategory === 'Colleges' ? (
            <div className="desktop-subheader__row">
              <span className="desktop-subheader__label">Search</span>
              <div className="desktop-subheader__scroller">
                <input
                  className="desktop-subheader__search"
                  type="text"
                  placeholder="Search colleges"
                  value={collegeSearch}
                  onChange={(e) => setCollegeSearch(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <div className="desktop-subheader__row">
            <span className="desktop-subheader__label">Details</span>
            <div className="desktop-subheader__scroller">
              {loading ? (
                <span className="desktop-subheader__hint">
                  <CircularProgress size={14} sx={{ color: '#7dd3fc' }} /> Loading...
                </span>
              ) : error ? (
                <span className="desktop-subheader__hint">{error}</span>
              ) : quickItems.length === 0 ? (
                <span className="desktop-subheader__hint">No items available</span>
              ) : (
                quickItems.map((item) => (
                  <button key={item} type="button" className="desktop-subheader__pill" onClick={() => onQuickItemClick(item)}>
                    {item}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Header() {
  const { toggleDrawer } = useLayout();
  const { user } = useAuth();
  const [fetchInFlight, setFetchInFlight] = useState(0);
  const [subHeaderCollapsed, setSubHeaderCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('desktopSubHeaderCollapsed') === '1';
    } catch {
      return false;
    }
  });

  function toggleSubHeader() {
    setSubHeaderCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('desktopSubHeaderCollapsed', next ? '1' : '0');
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    initGlobalFetchTracker();

    const trackerWindow = window as Window & { __gwFetchInFlight?: number };
    setFetchInFlight(trackerWindow.__gwFetchInFlight || 0);

    const handler = (event: Event) => {
      const count = Number((event as CustomEvent<number>).detail || 0);
      setFetchInFlight(count);
    };
    window.addEventListener(FETCH_ACTIVITY_EVENT, handler);
    return () => {
      window.removeEventListener(FETCH_ACTIVITY_EVENT, handler);
    };
  }, []);

  return (
    <AppBar position="sticky" elevation={6} color="inherit" className="layout-appbar">
      {fetchInFlight > 0 ? (
        <LinearProgress
          color="warning"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: 1400
          }}
        />
      ) : null}
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
            {user ? (
              <Button
                component={RouterLink}
                to="/student/dashboard"
                variant="outlined"
                size="small"
                startIcon={<DashboardRounded fontSize="small" />}
                className="header-dashboard-btn"
              >
                My Dashboard
              </Button>
            ) : null}
            {user ? <UserMenu /> : <LoginPopover />}
          </div>
        </Container>
      </Toolbar>
      <DesktopSubHeader collapsed={subHeaderCollapsed} onToggleCollapse={toggleSubHeader} />
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
