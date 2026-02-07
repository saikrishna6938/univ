import { useEffect, useState } from 'react';
import type { Country, Program } from '../lib/api';
import { fetchCountries, searchPrograms } from '../lib/api';

export type ProgramFilters = { search?: string; country?: string; level?: string };

type Options = { initialFilters?: ProgramFilters; limit?: number };

export function useProgramSearch(options: Options = {}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filters, setFilters] = useState<ProgramFilters>(options.initialFilters || {});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    searchPrograms(filters)
      .then((list) => setPrograms(options.limit ? list.slice(0, options.limit) : list))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters, options.limit]);

  return { countries, programs, filters, setFilters, loading, error, setError };
}
