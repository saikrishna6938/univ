import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Country } from '../lib/api';
import { fetchCountries } from '../lib/api';

function getId(c?: Country) {
  if (!c) return undefined;
  return (c.id ?? c._id)?.toString();
}

type CountryState = {
  countries: Country[];
  selectedCountryId?: string;
  setSelectedCountryId: (id?: string) => void;
  selectedCountry?: Country;
  loading: boolean;
  error?: string | null;
};

const CountryContext = createContext<CountryState | undefined>(undefined);
const STORAGE_KEY = 'selectedCountryId';

export function CountryProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | undefined>(() => {
    return localStorage.getItem(STORAGE_KEY) || undefined;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries()
      .then((list) => {
        setCountries(list);
        setLoading(false);

        // If no selection yet, default to first country (if available)
        if (!selectedCountryId && list.length) {
          const defaultId = getId(list[0]);
          if (defaultId) {
            setSelectedCountryId(defaultId);
            localStorage.setItem(STORAGE_KEY, defaultId);
          }
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedCountryId]);

  const value = useMemo(() => {
    const selectedCountry = countries.find((c) => getId(c) === selectedCountryId);
    const setter = (id?: string) => {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setSelectedCountryId(id);
    };

    return { countries, selectedCountryId, selectedCountry, setSelectedCountryId: setter, loading, error };
  }, [countries, selectedCountryId, loading, error]);

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used within CountryProvider');
  return ctx;
}
