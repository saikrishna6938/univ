import { useState } from "react";
import "./HowWeWork.css";
import ShortlistModal from "./ShortlistModal";

const steps = [
  { title: "Register Yourself", body: "Start by registering with us! Your first step towards a successful academic future begins here." },
  { title: "Career Counselling", body: "Talk to our counsellors and know which country, course and college is better for you." },
  { title: "Entrance Test", body: "Identify the best entrance test based on country and preparation tips." },
  { title: "University Shortlist", body: "Our counsellors will help you shortlist best college as per the score." },
  { title: "Application Prep", body: "We help you prepare strong applications and essays tailored to each university." },
  { title: "Scholarships & Aid", body: "Explore scholarships, assistantships, and aid options suited to your profile." },
  { title: "Visa & Interview", body: "Guidance on visa documentation and mock interviews to boost approval chances." },
  { title: "Pre-Departure", body: "Get checklists, housing tips, and orientation support before you fly." },
];

export default function HowWeWork() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="howwork">
        <div className="howwork__header">
          <h2>How Do We Work</h2>
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
            Get Information
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
