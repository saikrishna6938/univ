import './find-course.css';
import type { Program } from '../../lib/api';

type Props = { program: Program; onApply?: (program: Program) => void };

export default function ProgramCard({ program, onApply }: Props) {
  return (
    <article className="fc-card">
      <header className="fc-card__header">
        <div>
          <h3>{program.programName}</h3>
          <div className="fc-card__sub">{program.universityName}</div>
        </div>
        <button className="fc-link" onClick={() => onApply?.(program)}>
          Apply Now →
        </button>
      </header>
      <div className="fc-card__meta">
        {program.durationInYears && <span>Duration: {program.durationInYears} yrs</span>}
        {program.levelOfStudy && <span>{program.levelOfStudy}</span>}
        {program.languageOfStudy && <span>{program.languageOfStudy}</span>}
        {program.tuitionFeePerYear && <span>Fee/yr: {program.tuitionFeePerYear}</span>}
      </div>
      {program.intakes && <div className="fc-card__line">Intakes: {program.intakes}</div>}
      {program.deadlines && <div className="fc-card__line">Deadlines: {program.deadlines}</div>}
      <div className="fc-card__footer">
        <span className="fc-tag">On Campus</span>
        <span className="fc-tag fc-tag--soft">Full Time</span>
      </div>
    </article>
  );
}
