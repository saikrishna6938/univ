import { useMemo, useState } from 'react';
import type { ApplicationInput, Program } from '../lib/api';
import { submitApplication } from '../lib/api';

type Props = {
  programs: Program[];
};

export default function ApplicationForm({ programs }: Props) {
  const [appInput, setAppInput] = useState<ApplicationInput>({ program: '', applicantName: '', email: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isApplicationReady = useMemo(
    () => Boolean(appInput.program && appInput.applicantName && appInput.email),
    [appInput]
  );

  async function handleApply() {
    if (!isApplicationReady) return;
    setError(null);
    setSubmitted(false);
    try {
      await submitApplication(appInput);
      setSubmitted(true);
      setAppInput({ ...appInput, applicantName: '', email: '', phone: '', statement: '' });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="form">
      <label>
        Program
        <select value={appInput.program} onChange={(e) => setAppInput((a) => ({ ...a, program: e.target.value }))} required>
          <option value="">Select a program</option>
          {programs.map((p) => (
            <option key={String(p.id ?? p._id)} value={String(p.id ?? p._id)}>
              {p.programName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Full name
        <input value={appInput.applicantName} onChange={(e) => setAppInput((a) => ({ ...a, applicantName: e.target.value }))} required />
      </label>
      <label>
        Email
        <input type="email" value={appInput.email} onChange={(e) => setAppInput((a) => ({ ...a, email: e.target.value }))} required />
      </label>
      <label>
        Phone
        <input value={appInput.phone || ''} onChange={(e) => setAppInput((a) => ({ ...a, phone: e.target.value }))} />
      </label>
      <label>
        Statement
        <textarea
          rows={4}
          placeholder="Share a brief statement"
          value={appInput.statement || ''}
          onChange={(e) => setAppInput((a) => ({ ...a, statement: e.target.value }))}
        />
      </label>
      <button disabled={!isApplicationReady} onClick={handleApply}>
        Submit application
      </button>
      {error && <p className="error">{error}</p>}
      {submitted && <p className="success">Application submitted!</p>}
    </div>
  );
}
