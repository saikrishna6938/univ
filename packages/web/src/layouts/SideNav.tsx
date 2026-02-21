import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import IconButton from '@mui/material/IconButton';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from './LayoutContext';
import { useCountry } from './CountryContext';
import {
  fetchConcentrations,
  fetchExams,
  fetchScholarships,
  fetchStudyGuideTopics,
  fetchStudyGuides,
  fetchUniversities,
  type ConcentrationItem,
  type ExamItem,
  type ScholarshipItem,
  type StudyGuideItem,
  type StudyGuideTopicItem,
  type UniversityItem
} from '../components/find-course/api';

export default function SideNav() {
  const { drawerOpen, closeDrawer } = useLayout();
  const { countries, selectedCountryId, setSelectedCountryId } = useCountry();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'countries' | 'categories' | 'courses' | 'colleges' | 'scholarships' | 'studyTopics' | 'studyGuides' | 'exams'>('countries');
  const [drawerCountryId, setDrawerCountryId] = useState<string | undefined>(selectedCountryId);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courses, setCourses] = useState<ConcentrationItem[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [collegesError, setCollegesError] = useState<string | null>(null);
  const [colleges, setColleges] = useState<UniversityItem[]>([]);
  const [scholarshipsLoading, setScholarshipsLoading] = useState(false);
  const [scholarshipsError, setScholarshipsError] = useState<string | null>(null);
  const [scholarships, setScholarships] = useState<ScholarshipItem[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [studyTopicsLoading, setStudyTopicsLoading] = useState(false);
  const [studyTopicsError, setStudyTopicsError] = useState<string | null>(null);
  const [studyTopics, setStudyTopics] = useState<StudyGuideTopicItem[]>([]);
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<StudyGuideTopicItem | null>(null);
  const [studyGuidesLoading, setStudyGuidesLoading] = useState(false);
  const [studyGuidesError, setStudyGuidesError] = useState<string | null>(null);
  const [studyGuides, setStudyGuides] = useState<StudyGuideItem[]>([]);

  const categories = ['Courses', 'Colleges', 'Scholarships', 'Study Guide', 'Exams'];

  useEffect(() => {
    if (!drawerOpen) {
      setView('countries');
      setQuery('');
      setCourses([]);
      setCoursesError(null);
      setColleges([]);
      setCollegesError(null);
      setScholarships([]);
      setScholarshipsError(null);
      setExams([]);
      setExamsError(null);
      setStudyTopics([]);
      setStudyTopicsError(null);
      setSelectedStudyTopic(null);
      setStudyGuides([]);
      setStudyGuidesError(null);
      setDrawerCountryId(selectedCountryId);
    }
  }, [drawerOpen, selectedCountryId]);

  useEffect(() => {
    if (selectedCountryId) setDrawerCountryId(selectedCountryId);
  }, [selectedCountryId]);

  const filteredCountries = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((country) => country.name.toLowerCase().includes(term));
  }, [countries, query]);

  const filteredCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    const normalized = courses.filter((item) => {
      const name = (item.concentrationName || item.concentration || '').trim();
      return Boolean(name);
    });
    if (!term) return normalized;
    return normalized.filter((item) => {
      const name = (item.concentrationName || item.concentration || '').toLowerCase();
      return name.includes(term);
    });
  }, [courses, query]);

  const filteredColleges = useMemo(() => {
    const term = query.trim().toLowerCase();
    const normalized = colleges.filter((item) => item.universityName && item.universityName.trim() !== '');
    if (!term) return normalized;
    return normalized.filter((item) => item.universityName.toLowerCase().includes(term));
  }, [colleges, query]);

  const filteredScholarships = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return scholarships;
    return scholarships.filter((item) => item.name.toLowerCase().includes(term));
  }, [scholarships, query]);

  const filteredExams = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return exams;
    return exams.filter((item) => item.name.toLowerCase().includes(term));
  }, [exams, query]);

  const filteredStudyTopics = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return studyTopics;
    return studyTopics.filter((item) => item.name.toLowerCase().includes(term));
  }, [studyTopics, query]);

  const filteredStudyGuides = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return studyGuides;
    return studyGuides.filter((item) => item.title.toLowerCase().includes(term));
  }, [studyGuides, query]);

  useEffect(() => {
    let active = true;
    const countryId = drawerCountryId || selectedCountryId;
    if (view !== 'courses' || !countryId) return;

    setCoursesLoading(true);
    setCoursesError(null);
    fetchConcentrations(countryId)
      .then((items) => {
        if (!active) return;
        setCourses(items);
      })
      .catch((err) => {
        if (!active) return;
        setCoursesError(err instanceof Error ? err.message : 'Failed to load courses');
      })
      .finally(() => {
        if (!active) return;
        setCoursesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, drawerCountryId, selectedCountryId]);

  useEffect(() => {
    let active = true;
    const countryId = drawerCountryId || selectedCountryId;
    if (view !== 'exams' || !countryId) return;

    setExamsLoading(true);
    setExamsError(null);
    fetchExams(countryId)
      .then((items) => {
        if (!active) return;
        setExams(items);
      })
      .catch((err) => {
        if (!active) return;
        setExamsError(err instanceof Error ? err.message : 'Failed to load exams');
      })
      .finally(() => {
        if (!active) return;
        setExamsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, drawerCountryId, selectedCountryId]);

  useEffect(() => {
    let active = true;
    if (view !== 'studyTopics') return;
    setStudyTopicsLoading(true);
    setStudyTopicsError(null);
    fetchStudyGuideTopics()
      .then((items) => {
        if (!active) return;
        setStudyTopics(items);
      })
      .catch((err) => {
        if (!active) return;
        setStudyTopicsError(err instanceof Error ? err.message : 'Failed to load study guide topics');
      })
      .finally(() => {
        if (!active) return;
        setStudyTopicsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view]);

  useEffect(() => {
    let active = true;
    const countryId = drawerCountryId || selectedCountryId;
    if (view !== 'studyGuides' || !countryId || !selectedStudyTopic?.id) return;
    setStudyGuidesLoading(true);
    setStudyGuidesError(null);
    fetchStudyGuides({ countryId, topicId: selectedStudyTopic.id })
      .then((items) => {
        if (!active) return;
        setStudyGuides(items);
      })
      .catch((err) => {
        if (!active) return;
        setStudyGuidesError(err instanceof Error ? err.message : 'Failed to load study guides');
      })
      .finally(() => {
        if (!active) return;
        setStudyGuidesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, drawerCountryId, selectedCountryId, selectedStudyTopic?.id]);

  useEffect(() => {
    let active = true;
    const countryId = drawerCountryId || selectedCountryId;
    if (view !== 'scholarships' || !countryId) return;

    setScholarshipsLoading(true);
    setScholarshipsError(null);
    fetchScholarships(countryId)
      .then((items) => {
        if (!active) return;
        setScholarships(items);
      })
      .catch((err) => {
        if (!active) return;
        setScholarshipsError(err instanceof Error ? err.message : 'Failed to load scholarships');
      })
      .finally(() => {
        if (!active) return;
        setScholarshipsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, drawerCountryId, selectedCountryId]);

  useEffect(() => {
    let active = true;
    const countryId = drawerCountryId || selectedCountryId;
    if (view !== 'colleges' || !countryId) return;

    setCollegesLoading(true);
    setCollegesError(null);
    fetchUniversities(countryId)
      .then((items) => {
        if (!active) return;
        setColleges(items);
      })
      .catch((err) => {
        if (!active) return;
        setCollegesError(err instanceof Error ? err.message : 'Failed to load colleges');
      })
      .finally(() => {
        if (!active) return;
        setCollegesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, drawerCountryId, selectedCountryId]);

  const drawer = (
    <div className="country-drawer">
      {view === 'countries' ? (
        <>
          <div className="country-drawer__header">
            <h2>Countries</h2>
            <IconButton size="small" onClick={closeDrawer} aria-label="Close countries drawer">
              <CloseRounded />
            </IconButton>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Countries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {filteredCountries.map((country) => {
              const id = (country.id ?? country._id)?.toString();
              const selected = Boolean(id && id === selectedCountryId);
              return (
                <button
                  key={id || country.name}
                  type="button"
                  className={`country-row ${selected ? 'country-row--active' : ''}`}
                  onClick={() => {
                    setSelectedCountryId(id);
                    setDrawerCountryId(id);
                    setView('categories');
                  }}
                >
                  <span>{country.name}</span>
                  <ChevronRightRounded />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        view === 'categories' ? (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('countries')} aria-label="Back to countries">
                <ArrowBackRounded />
              </IconButton>
              <h2>Category</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__list">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className="country-row category-row"
                onClick={() => {
                  if (category === 'Courses') {
                    setView('courses');
                    setQuery('');
                    return;
                  }
                  if (category === 'Colleges') {
                    setView('colleges');
                    setQuery('');
                    return;
                  }
                  if (category === 'Scholarships') {
                    setView('scholarships');
                    setQuery('');
                    return;
                  }
                  if (category === 'Study Guide') {
                    setView('studyTopics');
                    setQuery('');
                    return;
                  }
                  if (category === 'Exams') {
                    setView('exams');
                    setQuery('');
                    return;
                  }
                  closeDrawer();
                }}
              >
                <span>{category}</span>
                {category === 'Courses' || category === 'Colleges' || category === 'Scholarships' || category === 'Study Guide' || category === 'Exams' ? <ChevronRightRounded /> : <AddRounded />}
              </button>
            ))}
          </div>
        </>
        ) : view === 'courses' ? (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('categories')} aria-label="Back to category">
                <ArrowBackRounded />
              </IconButton>
              <h2>Courses</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Courses"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {coursesLoading ? (
              <div className="country-row category-row">
                <span>Loading courses...</span>
              </div>
            ) : null}
            {coursesError ? (
              <div className="country-row category-row">
                <span>{coursesError}</span>
              </div>
            ) : null}
            {!coursesLoading && !coursesError && filteredCourses.length === 0 ? (
              <div className="country-row category-row">
                <span>No courses found</span>
              </div>
            ) : null}
            {!coursesLoading && !coursesError
              ? filteredCourses.map((item) => {
                  const courseName = item.concentrationName || item.concentration || 'Course';
                  return (
                    <button
                      key={`${item.concentrationId ?? courseName}`}
                      type="button"
                      className="country-row category-row"
                      onClick={() => {
                        const countryId = drawerCountryId || selectedCountryId;
                        const params = new URLSearchParams();
                        if (countryId) params.set('country', countryId);
                        params.set('concentration', courseName);
                        navigate(`/find-course?${params.toString()}`);
                        closeDrawer();
                      }}
                    >
                      <span>{courseName}</span>
                      <ChevronRightRounded />
                    </button>
                  );
                })
              : null}
          </div>
        </>
        ) : view === 'colleges' ? (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('categories')} aria-label="Back to category">
                <ArrowBackRounded />
              </IconButton>
              <h2>Colleges</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Colleges"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {collegesLoading ? (
              <div className="country-row category-row">
                <span>Loading colleges...</span>
              </div>
            ) : null}
            {collegesError ? (
              <div className="country-row category-row">
                <span>{collegesError}</span>
              </div>
            ) : null}
            {!collegesLoading && !collegesError && filteredColleges.length === 0 ? (
              <div className="country-row category-row">
                <span>No colleges found</span>
              </div>
            ) : null}
            {!collegesLoading && !collegesError
              ? filteredColleges.map((item) => {
                  const countryId = drawerCountryId || selectedCountryId;
                  return (
                    <button
                      key={item.universityName}
                      type="button"
                      className="country-row category-row"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (countryId) params.set('country', countryId);
                        params.set('university', item.universityName);
                        navigate(`/find-course?${params.toString()}`);
                        closeDrawer();
                      }}
                    >
                      <span>{item.universityName}</span>
                      <ChevronRightRounded />
                    </button>
                  );
                })
              : null}
          </div>
        </>
        ) : view === 'scholarships' ? (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('categories')} aria-label="Back to category">
                <ArrowBackRounded />
              </IconButton>
              <h2>Scholarships</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Scholarships"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {scholarshipsLoading ? (
              <div className="country-row category-row">
                <span>Loading scholarships...</span>
              </div>
            ) : null}
            {scholarshipsError ? (
              <div className="country-row category-row">
                <span>{scholarshipsError}</span>
              </div>
            ) : null}
            {!scholarshipsLoading && !scholarshipsError && filteredScholarships.length === 0 ? (
              <div className="country-row category-row">
                <span>No scholarships found</span>
              </div>
            ) : null}
            {!scholarshipsLoading && !scholarshipsError
              ? filteredScholarships.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="country-row category-row"
                    onClick={() => {
                      navigate(`/scholarships/${item.id}`);
                      closeDrawer();
                    }}
                  >
                    <span>{item.name}</span>
                    <ChevronRightRounded />
                  </button>
                ))
              : null}
          </div>
        </>
        ) : view === 'exams' ? (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('categories')} aria-label="Back to category">
                <ArrowBackRounded />
              </IconButton>
              <h2>Exams</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Exams"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {examsLoading ? (
              <div className="country-row category-row">
                <span>Loading exams...</span>
              </div>
            ) : null}
            {examsError ? (
              <div className="country-row category-row">
                <span>{examsError}</span>
              </div>
            ) : null}
            {!examsLoading && !examsError && filteredExams.length === 0 ? (
              <div className="country-row category-row">
                <span>No exams found</span>
              </div>
            ) : null}
            {!examsLoading && !examsError
              ? filteredExams.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="country-row category-row"
                    onClick={() => {
                      navigate(`/exams/${item.id}`);
                      closeDrawer();
                    }}
                  >
                    <span>{item.name}</span>
                    <ChevronRightRounded />
                  </button>
                ))
              : null}
          </div>
        </>
        ) : view === 'studyTopics' ? (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('categories')} aria-label="Back to category">
                <ArrowBackRounded />
              </IconButton>
              <h2>Study Guide Topics</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Topics"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {studyTopicsLoading ? (
              <div className="country-row category-row">
                <span>Loading topics...</span>
              </div>
            ) : null}
            {studyTopicsError ? (
              <div className="country-row category-row">
                <span>{studyTopicsError}</span>
              </div>
            ) : null}
            {!studyTopicsLoading && !studyTopicsError && filteredStudyTopics.length === 0 ? (
              <div className="country-row category-row">
                <span>No topics found</span>
              </div>
            ) : null}
            {!studyTopicsLoading && !studyTopicsError
              ? filteredStudyTopics.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="country-row category-row"
                    onClick={() => {
                      setSelectedStudyTopic(item);
                      setView('studyGuides');
                      setQuery('');
                    }}
                  >
                    <span>{item.name}</span>
                    <ChevronRightRounded />
                  </button>
                ))
              : null}
          </div>
        </>
        ) : (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('studyTopics')} aria-label="Back to topics">
                <ArrowBackRounded />
              </IconButton>
              <h2>{selectedStudyTopic?.name || 'Study Guides'}</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Study Guides"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {studyGuidesLoading ? (
              <div className="country-row category-row">
                <span>Loading study guides...</span>
              </div>
            ) : null}
            {studyGuidesError ? (
              <div className="country-row category-row">
                <span>{studyGuidesError}</span>
              </div>
            ) : null}
            {!studyGuidesLoading && !studyGuidesError && filteredStudyGuides.length === 0 ? (
              <div className="country-row category-row">
                <span>No study guides found</span>
              </div>
            ) : null}
            {!studyGuidesLoading && !studyGuidesError
              ? filteredStudyGuides.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="country-row category-row"
                    onClick={() => {
                      navigate(`/study-guides/${item.id}`);
                      closeDrawer();
                    }}
                  >
                    <span>{item.title}</span>
                    <ChevronRightRounded />
                  </button>
                ))
              : null}
          </div>
        </>
        )
      )}
    </div>
  );

  return (
    <Drawer
      variant="temporary"
      open={drawerOpen}
      onClose={closeDrawer}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: { xs: '100%', sm: 420 },
          maxWidth: '100vw'
        }
      }}
    >
      {drawer}
    </Drawer>
  );
}
