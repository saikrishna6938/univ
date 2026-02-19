import './find-course.css';
import type { Program } from '../../lib/api';

type Props = { program: Program; onApply?: (program: Program) => void };

export default function ProgramCard({ program, onApply }: Props) {
  const p = program as Program & Record<string, unknown>;
  const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = p[key];
      if (value === null || value === undefined) continue;
      if (typeof value === 'string' && value.trim() === '') continue;
      return value;
    }
    return undefined;
  };

  const fmt = (value: unknown) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
  };

  const kv = (label: string, value: unknown) => {
    const text = fmt(value);
    if (!text) return null;
    return (
      <div className="fc-kv" key={label}>
        <span className="fc-kv__label">{label}</span>
        <span className="fc-kv__value">{text}</span>
      </div>
    );
  };

  const fee = (value: unknown) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return inrFormatter.format(value);
    if (typeof value === 'string') {
      const normalized = value.replace(/[,\s]/g, '');
      if (/^-?\d+(\.\d+)?$/.test(normalized)) {
        return inrFormatter.format(Number(normalized));
      }
      return value.trim() || undefined;
    }
    return fmt(value);
  };

  const intakes =
    read('intakes') ||
    [read('springIntake', 'spring_intake'), read('summerIntake', 'summer_intake'), read('fallIntake', 'fall_intake')]
      .filter(Boolean)
      .join(' / ');
  const deadlines =
    read('deadlines') ||
    [
      read('springDeadline', 'spring_deadline'),
      read('summerDeadline', 'summer_deadline'),
      read('fallDeadline', 'fall_deadline')
    ]
      .filter(Boolean)
      .join(' / ');

  const quickTags = [
    fmt(read('levelOfStudy', 'level_of_study')),
    fmt(read('concentration')),
    fmt(read('teachingForm', 'teaching_form')),
    fmt(read('paceOfStudy', 'pace_of_study')),
    fmt(read('languageOfStudy', 'language_of_study')),
    fmt(program.country?.name),
    fmt(read('location'))
  ].filter(Boolean) as string[];

  return (
    <article className="fc-card">
      <header className="fc-card__header">
        <div>
          <h3>{program.programName}</h3>
          <div className="fc-card__sub">{program.universityName}</div>
        </div>
        <button type="button" className="fc-link" onClick={() => onApply?.(program)}>
          Apply Now →
        </button>
      </header>

      {quickTags.length > 0 && (
        <div className="fc-card__meta">
          {quickTags.slice(0, 7).map((tag) => (
            <span key={tag} className="fc-tag fc-tag--soft">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="fc-card__sections">
        <section className="fc-section">
          <h4>Overview</h4>
          <div className="fc-kv-list">
            {kv('Duration (Years)', read('durationInYears', 'duration_in_years'))}
            {kv('Duration (Months)', read('durationInMonths', 'duration_in_months'))}
            {kv('Campus', read('campus'))}
            {kv('Type', read('privateOrPublic', 'private_or_public'))}
            {kv('Portal/Direct', read('portalOrDirect', 'portal_or_direct'))}
            {kv('Credits', read('credits'))}
          </div>
        </section>

        <section className="fc-section">
          <h4>Fees</h4>
          <div className="fc-kv-list">
            {kv('Currency', 'INR')}
            {kv('Tuition / Year', fee(read('tuitionFeePerYear', 'tuition_fee_per_year')))}
            {kv('Tuition / Semester', fee(read('tuitionFeePerSemester', 'tuition_fee_per_semester')))}
            {kv('Tuition / Course', fee(read('tuitionFeePerCourse', 'tuition_fee_per_course')))}
            {kv('Application Fee', fee(read('applicationFee', 'application_fee')))}
            {kv('Admission Fee', fee(read('admissionFee', 'admission_fee')))}
            {kv('Initial Deposit', fee(read('initialDeposit', 'initial_deposit')))}
          </div>
        </section>

        <section className="fc-section">
          <h4>Admission</h4>
          <div className="fc-kv-list">
            {kv('15yr Degree', read('degree15yrAccepted', 'degree_15yr_accepted'))}
            {kv('Backlogs', read('backlogs'))}
            {kv('MOI Accepted', read('moiAccepted', 'moi_accepted'))}
            {kv('WES Required', read('wesRequired', 'wes_required'))}
            {kv('APS Required', read('apsRequired', 'aps_required'))}
            {kv('Gap Accepted', read('gapAccepted', 'gap_accepted'))}
            {kv('Without Maths', read('withoutMaths', 'without_maths'))}
          </div>
        </section>

        <section className="fc-section">
          <h4>Scores</h4>
          <div className="fc-kv-list">
            {kv('IELTS', read('ielts'))}
            {kv('TOEFL', read('toefl'))}
            {kv('Duolingo', read('duolingo'))}
            {kv('PTE', read('pte'))}
            {kv('GRE', read('greScore', 'gre_score'))}
            {kv('GMAT', read('gmatScore', 'gmat_score'))}
            {kv('SAT', read('satScore', 'sat_score'))}
            {kv('ACT', read('actScore', 'act_score'))}
          </div>
        </section>

        <section className="fc-section fc-section--wide">
          <h4>Intake & Deadlines</h4>
          <div className="fc-kv-list">
            {kv('Intakes', intakes)}
            {kv('Deadlines', deadlines)}
            {kv('Scholarship', read('scholarship'))}
            {kv('Post Study Work Visa', read('postStudyWorkVisa', 'post_study_work_visa'))}
          </div>
        </section>
      </div>
    </article>
  );
}
