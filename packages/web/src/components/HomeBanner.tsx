import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../layouts/AuthContext";
import ShortlistModal from "./ShortlistModal";

const perks = [
  "Personalized profile review",
  "Dedicated counsellor support",
  "Transparent process tracking",
  "Application and visa guidance",
  "Regular follow-up sessions",
  "SOP and document support",
];

export default function HomeBanner() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleShortlistAction() {
    if (user) {
      navigate("/find-course");
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <section className="hero-banner">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-eyebrow">Gradwalk Student Platform</p>
            <h1>Plan Your Study Abroad Journey With Confidence</h1>
            <p className="hero-sub">
              Discover the right programs, prepare strong applications, and get expert guidance from shortlist to visa.
            </p>
            <div className="hero-actions">
              <button className="hero-btn hero-btn--primary" type="button" onClick={handleShortlistAction}>
                Shortlist Programs
              </button>
              <button className="hero-btn hero-btn--secondary" type="button" onClick={handleShortlistAction}>
                Start Application
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
