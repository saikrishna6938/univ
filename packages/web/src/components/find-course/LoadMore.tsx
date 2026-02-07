import './find-course.css';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function LoadMore({ onClick, disabled, loading }: Props) {
  return (
    <div className="fc-loadmore">
      <button type="button" className="fc-loadmore__btn" onClick={onClick} disabled={disabled}>
        {loading ? 'Loading…' : disabled ? 'No more results' : 'Load more'}
      </button>
    </div>
  );
}
