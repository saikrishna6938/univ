import { useEffect, useMemo, useState } from 'react';
import { useCountry } from '../../layouts/CountryContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchBarInline from './SearchBarInline';
import FiltersBar from './FiltersBar';
import FiltersSidebar from './FiltersSidebar';
import ProgramCard from './ProgramCard';
import LoadMore from './LoadMore';
import ProgramDetailModal from './ProgramDetailModal';
import InfoDialog from './InfoDialog';
import type { Program } from '../../lib/api';
import { fetchProgramsPaginated } from './api';
import './find-course.css';
import ShortlistModal, { type FormState as LeadForm } from '../ShortlistModal';
import { useAuth } from '../../layouts/AuthContext';
import { submitApplication } from '../../lib/api';

const PAGE_SIZE = 10;

export default function FindCourseLayout() {
  const { selectedCountryId } = useCountry();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialSearch = searchParams.get('q') || '';
  const [search, setSearch] = useState(initialSearch);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);
  const { user } = useAuth();
  const [storedLead, setStoredLead] = useState<LeadForm | null>(() => {
    try {
      const raw = localStorage.getItem('shortlist_lead');
      return raw ? (JSON.parse(raw) as LeadForm) : null;
    } catch {
      return null;
    }
  });

  const countryId = useMemo(() => searchParams.get('country') || selectedCountryId || undefined, [searchParams, selectedCountryId]);

  useEffect(() => {
    setPrograms([]);
    setOffset(0);
    setHasMore(true);
  }, [countryId]);

  useEffect(() => {
    // trigger initial load
    loadPrograms(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, countryId]);

  const loadPrograms = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const nextOffset = reset ? 0 : offset;
      const { items } = await fetchProgramsPaginated({
        search: search || undefined,
        countryId,
        offset: nextOffset,
        limit: PAGE_SIZE,
        token: import.meta.env.VITE_CURRENT_URL_TOKEN_REQUEST
      });

      setPrograms((prev) => (reset ? items : [...prev, ...items]));
      setOffset(nextOffset + items.length);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      setError((err as Error).message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set('q', value); else params.delete('q');
    if (countryId) params.set('country', countryId); else params.delete('country');
    navigate({ pathname: '/find-course', search: params.toString() });
  };

  const getProgramId = (program: Program | null | undefined) => {
    if (!program) return undefined;
    return String((program as any).id ?? program._id);
  };

  const submitWithLead = async (program: Program, lead: LeadForm) => {
    const programId = getProgramId(program);
    if (!programId) throw new Error('Missing program id');
    await submitApplication({
      program: programId,
      applicantName: lead.name,
      email: lead.email,
      phone: lead.phone,
      statement: 'Applied via FindCourse (saved lead)',
      notes: `City: ${lead.city}; Course: ${lead.course}; Start: ${lead.start}`,
    });
  };

  return (
    <div className="findcourse-page">
      <header className="findcourse-header">
        <div className="breadcrumb">Home › Course Finder</div>
        <h1>List of Top Courses</h1>
        <p className="muted">Personalize results by country and keywords. Updated for {new Date().getFullYear()}.</p>
        <SearchBarInline value={search} onSubmit={handleSearchSubmit} onChange={setSearch} />
      </header>

      <div className="findcourse-body">
        <aside className="sidebar">
          <FiltersSidebar />
        </aside>
        <section className="results">
          <FiltersBar countryId={countryId} onSearch={handleSearchSubmit} search={search} />
          {error && <div className="error">{error}</div>}
          {!error && programs.length === 0 && !loading && <div className="empty">No programs found. Try another keyword.</div>}
          <div className="program-list">
            {programs.map((p) => (
              <ProgramCard key={p._id} program={p} onApply={setSelectedProgram} />
            ))}
          </div>
          <LoadMore onClick={() => loadPrograms(false)} disabled={!hasMore || loading} loading={loading} />
        </section>
      </div>

      <ProgramDetailModal
        open={Boolean(selectedProgram)}
        program={selectedProgram}
        onClose={() => setSelectedProgram(null)}
        onApply={(program) => {
          if (!program) return;
          const programId = getProgramId(program);
          if (user) {
            submitApplication({
              program: programId,
              applicantName: user.name || 'User',
              email: user.email || '',
              phone: user.phone,
              statement: 'Applied via FindCourse',
            })
              .then(() => setShowInfo(true))
              .catch((err) => setError(err.message));
          } else {
            // If we already have a saved lead, reuse it and skip modal
            if (storedLead) {
              submitWithLead(program, storedLead)
                .then(() => setShowInfo(true))
                .catch((err) => setError(err.message));
            } else {
              setShowShortlist(true);
            }
          }
        }}
      />
      <ShortlistModal
        open={showShortlist}
        onClose={() => setShowShortlist(false)}
        onSubmitted={(form) => {
          setStoredLead(form);
          localStorage.setItem('shortlist_lead', JSON.stringify(form));
          const program = selectedProgram;
          if (!program) {
            setShowInfo(true);
            setShowShortlist(false);
            return;
          }
          submitWithLead(program, form)
            .then(() => setShowInfo(true))
            .catch((err) => setError(err.message))
            .finally(() => setShowShortlist(false));
        }}
        initialValues={storedLead ?? undefined}
      />
      <InfoDialog open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
}
