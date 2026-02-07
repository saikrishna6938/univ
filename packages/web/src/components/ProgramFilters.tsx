import type { Country } from '../lib/api';
import type { ProgramFilters } from '../hooks/useProgramSearch';

type Props = {
  countries: Country[];
  filters: ProgramFilters;
  onChange: (filters: ProgramFilters) => void;
};

export default function ProgramFilters({ countries, filters, onChange }: Props) {
  return (
    <div className="filters">
      <label>
        Keyword
        <input
          placeholder="Program or university"
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>
      <label>
        Country
        <select
          value={filters.country || ''}
          onChange={(e) => onChange({ ...filters, country: e.target.value || undefined })}
        >
          <option value="">Any</option>
          {countries.map((c) => (
            <option key={(c.id ?? c._id) as string} value={(c.id ?? c._id) as string}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Level
        <select value={filters.level || ''} onChange={(e) => onChange({ ...filters, level: e.target.value || undefined })}>
          <option value="">Any</option>
          <option>Undergraduate</option>
          <option>Graduate</option>
          <option>Doctorate</option>
          <option>Diploma</option>
        </select>
      </label>
    </div>
  );
}
