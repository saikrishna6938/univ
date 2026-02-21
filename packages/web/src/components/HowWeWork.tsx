import { useState } from "react";
import "./HowWeWork.css";
import ShortlistModal from "./ShortlistModal";

const steps = [
  { title: "Create Your Profile", body: "Tell us about your academics, test scores, and preferences so we can personalize your roadmap." },
  { title: "Counselling Session", body: "Review your profile with an expert and define your target countries, programs, and intake timeline." },
  { title: "Test Planning", body: "Get guidance on the exams you need, ideal score targets, and a realistic preparation plan." },
  { title: "Program Shortlisting", body: "Build a balanced shortlist of ambitious, moderate, and safe university options." },
  { title: "Application Preparation", body: "Prepare SOPs, LORs, CV, and required documents with structured review support." },
  { title: "Funding Strategy", body: "Plan tuition and living costs while evaluating scholarships, loans, and assistantship options." },
  { title: "Visa Readiness", body: "Complete visa documentation and interview preparation with destination-specific guidance." },
  { title: "Pre-Departure Support", body: "Get final checklists for accommodation, travel, and onboarding before classes begin." },
];

export default function HowWeWork() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="howwork">
        <div className="howwork__header">
          <h2>How Gradwalk Works</h2>
        </div>
        <div className="howwork__timeline">
          {steps.map((s, idx) => (
            <div className="howwork__card" key={s.title}>
              <div className="howwork__step">0{idx + 1}:</div>
              <div className="howwork__title">{s.title}</div>
              <div className="howwork__body">{s.body}</div>
            </div>
          ))}
        </div>
        <div className="howwork__actions">
          <button className="howwork__btn primary" onClick={() => setOpen(true)}>
            Get Details
          </button>
          <button className="howwork__btn secondary" onClick={() => setOpen(true)}>
            Book Appointment
          </button>
        </div>
      </section>
      <ShortlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
