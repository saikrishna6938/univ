import './find-course.css';

const streams = ['Arts', 'Engineering', 'Science', 'Management', 'Medical', 'Design', 'Vocational'];
const fees = ['0 - 25K', '25 - 50K', '50 - 75K', '75K - 1L', '1 - 2L'];

export default function FiltersSidebar() {
  return (
    <div className="fc-sidebar">
      <div className="fc-sidebar__section">
        <div className="fc-sidebar__title">Stream</div>
        <div className="fc-sidebar__list">
          {streams.map((s) => (
            <label key={s} className="fc-checkbox">
              <input type="checkbox" />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="fc-sidebar__section">
        <div className="fc-sidebar__title">Avg Fee Per Year</div>
        <div className="fc-sidebar__list">
          {fees.map((s) => (
            <label key={s} className="fc-checkbox">
              <input type="checkbox" />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
