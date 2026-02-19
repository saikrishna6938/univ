import "./find-course.css";
import { useCountry } from "../../layouts/CountryContext";

type Props = {
  countryId?: string;
  search: string;
  onSearch: any;
};

const filters = [
  "Course",
  "State",
  "City",
  "Entrance/Exam Accepted",
  "Program Type",
];

export default function FiltersBar({ countryId, search }: Props) {
  const { countries } = useCountry();
  const countryName = countryId
    ? countries.find((c) => (c.id ?? c._id)?.toString() === countryId)?.name
    : undefined;

  return (
    <div className="fc-filters">
      <div className="fc-filters__chips">
        <span className="fc-filter-label">Top Filters</span>
        {filters.map((f) => (
          <button key={f} type="button" className="fc-chip">
            {f}
          </button>
        ))}
        {countryId && (
          <span className="fc-chip fc-chip--active">
            {countryName || "Selected Country"}
          </span>
        )}
        {search && <span className="fc-chip fc-chip--ghost">“{search}”</span>}
      </div>
    </div>
  );
}
