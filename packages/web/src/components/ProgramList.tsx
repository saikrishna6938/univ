import type { Program } from '../lib/api';

type Props = {
  programs: Program[];
  loading?: boolean;
  onSelect?: (program: Program) => void;
  selectedId?: string;
};

export default function ProgramList({ programs, loading, onSelect, selectedId }: Props) {
  if (loading) return <p>Loading programs…</p>;
  if (!loading && programs.length === 0) return <p>No programs found. Adjust filters.</p>;

  return (
    <div className="list">
      {programs.map((program) => (
        <article
          key={program._id}
          className="program"
          onClick={() => onSelect?.(program)}
          role={onSelect ? 'button' : undefined}
        >
          <header>
            <h3>{program.programName}</h3>
            <span className="pill">{program.levelOfStudy || 'N/A'}</span>
          </header>
          <p className="muted">{program.universityName}</p>
          <p className="muted">{program.country?.name || program.location}</p>
          <div className="meta">
            {program.tuitionFeePerYear && <span>Tuition/yr: {program.tuitionFeePerYear}</span>}
            {program.languageOfStudy && <span>Language: {program.languageOfStudy}</span>}
            {program.intakes && <span>Intakes: {program.intakes}</span>}
            {program.deadlines && <span>Deadlines: {program.deadlines}</span>}
          </div>
          {selectedId === program._id && <div className="selected">Selected for application</div>}
        </article>
      ))}
    </div>
  );
}
