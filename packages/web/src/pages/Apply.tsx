import ApplicationForm from '../components/ApplicationForm';
import ProgramList from '../components/ProgramList';
import { useProgramSearch } from '../hooks/useProgramSearch';

export default function Apply() {
  const { programs, loading, error } = useProgramSearch();

  return (
    <div className="app grid">
      <section className="card">
        <h2>Pick a program</h2>
        <ProgramList programs={programs} loading={loading} />
      </section>

      <section className="card sticky" id="apply-form">
        <h2>Application</h2>
        <ApplicationForm programs={programs} />
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}
