import { useState } from "react";
import ShortlistModal from "./ShortlistModal";

const perks = [
  'Free Profile Evaluation',
  '150+ Experienced Counsellor',
  '5+ Years Average Experience',
  '95% Visa Success Rate',
  'Unlimited Follow Ups',
  'Best SOP Writers',
];

export default function HomeBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="hero-banner">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-eyebrow">Find Study Abroad Universities</p>
            <h1>Find Study Abroad Universities</h1>
            <p className="hero-sub">
              Expert counselling with 50% off on student visa fees. Choose from extensive colleges and course options.
            </p>
            <div className="hero-actions">
              <button className="hero-btn hero-btn--primary" type="button" onClick={() => setOpen(true)}>
                Shortlist College
              </button>
              <button className="hero-btn hero-btn--secondary" type="button" onClick={() => setOpen(true)}>
                Apply Now
              </button>
            </div>
          </div>
          <div className="hero-perks">
            {perks.map((perk) => (
              <div className="perk" key={perk}>
                <span className="perk-icon">✦</span>
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ShortlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
