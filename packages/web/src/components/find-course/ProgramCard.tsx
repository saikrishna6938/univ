import type { Program } from '../../lib/api';
import './find-course.css';

type Props = {
  program: Program;
  applied?: boolean;
  liked?: boolean;
  onApply?: (program: Program) => void;
  onToggleLike?: (program: Program) => void;
};

function toCurrency(value: unknown, program: Program) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (!Number.isNaN(num)) {
    const currencyCode = String(program.country?.currencyType || program.currency || '').trim().toUpperCase();
    if (currencyCode.length === 3) {
      try {
        return new Intl.NumberFormat('en', {
          style: 'currency',
          currency: currencyCode,
          maximumFractionDigits: 0
        }).format(num);
      } catch {
        // Fall through to symbol/plain formatting.
      }
    }

    const currencySymbol = String(program.country?.currencySymbol || '').trim();
    if (currencySymbol) {
      return `${currencySymbol}${new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(num)}`;
    }

    return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(num);
  }
  return String(value);
}

export default function ProgramCard({ program, applied = false, liked = false, onApply, onToggleLike }: Props) {
  return (
    <article className="fc-card fc-card--clean">
      <header className="fc-card__header fc-card__header--clean">
        <div>
          <h3>{program.programName}</h3>
          <div className="fc-card__sub">{program.universityName}</div>
        </div>
        <div className="fc-card__actions">
          <button
            type="button"
            className={`fc-like-btn ${liked ? 'is-active' : ''}`}
            onClick={() => onToggleLike?.(program)}
          >
            {liked ? 'Liked' : 'Like'}
          </button>
          <button
            type="button"
            className={`fc-apply-btn ${applied ? 'is-applied' : ''}`}
            onClick={() => !applied && onApply?.(program)}
            disabled={applied}
          >
            {applied ? 'Applied' : 'Apply Now'}
          </button>
        </div>
      </header>

      <div className="fc-card__meta">
        {program.levelOfStudy ? <span className="fc-tag fc-tag--soft">{program.levelOfStudy}</span> : null}
        {program.country?.name ? <span className="fc-tag fc-tag--soft">{program.country.name}</span> : null}
        {program.location ? <span className="fc-tag fc-tag--soft">{program.location}</span> : null}
        {program.languageOfStudy ? <span className="fc-tag fc-tag--soft">{program.languageOfStudy}</span> : null}
      </div>

      <div className="fc-card__quick-grid">
        <div className="fc-card__quick-item">
          <span>Tuition / Year</span>
          <strong>{toCurrency(program.tuitionFeePerYear, program)}</strong>
        </div>
        <div className="fc-card__quick-item">
          <span>Application Fee</span>
          <strong>{toCurrency(program.applicationFee, program)}</strong>
        </div>
        <div className="fc-card__quick-item">
          <span>Intakes</span>
          <strong>{program.intakes || '-'}</strong>
        </div>
        <div className="fc-card__quick-item">
          <span>Deadlines</span>
          <strong>{program.deadlines || '-'}</strong>
        </div>
      </div>
    </article>
  );
}
