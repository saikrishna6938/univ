import SearchRounded from '@mui/icons-material/SearchRounded';
import './find-course.css';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
};

export default function SearchBarInline({ value, onChange, onSubmit }: Props) {
  return (
    <form
      className="fc-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <SearchRounded className="fc-search__icon" />
      <input
        className="fc-search__input"
        placeholder="Find your desired course"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" className="fc-search__btn">
        Search
      </button>
    </form>
  );
}
