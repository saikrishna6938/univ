import ProgramFilters from '../components/ProgramFilters';
import ProgramList from '../components/ProgramList';
import { useProgramSearch } from '../hooks/useProgramSearch';
import { useCountry } from '../layouts/CountryContext';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Programs() {
  const [searchParams] = useSearchParams();
  const { selectedCountryId } = useCountry();
  const initialFilters = useMemo(() => {
    const q = searchParams.get('q') || undefined;
    const base: any = {};
    if (q) base.search = q;
    if (selectedCountryId) base.country = selectedCountryId;
    return base;
  }, [searchParams, selectedCountryId]);

  const { countries, programs, filters, setFilters, loading, error } = useProgramSearch({
    initialFilters
  });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, country: selectedCountryId || undefined }));
  }, [selectedCountryId, setFilters]);

  useEffect(() => {
    const q = searchParams.get('q') || undefined;
    setFilters((prev) => ({ ...prev, search: q }));
  }, [searchParams, setFilters]);

  return (
    <div className="app">
      <header className="page-header">
        <h1>Programs</h1>
        <p>Search, filter, and discover courses that match your profile.</p>
      </header>

      <section className="card">
        <ProgramFilters countries={countries} filters={filters} onChange={setFilters} />
        {error && <p className="error">{error}</p>}
        <ProgramList programs={programs} loading={loading} />
      </section>
    </div>
  );
}
