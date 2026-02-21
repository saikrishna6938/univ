import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeBanner from "../components/HomeBanner";
import FeaturedUniversities from "../components/FeaturedUniversities";
import GuidanceHome from "../components/GuidanceHome";
import FindByConcentration from "../components/FindByConcentration";
import HowWeWork from "../components/HowWeWork";
import MeetCounsellors from "../components/MeetCounsellors";
import EventsTimeline from "../components/EventsTimeline";
import ShortlistModal from "../components/ShortlistModal";
import { useAuth } from "../layouts/AuthContext";

export default function Home() {
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleShortlistNow() {
    if (user) {
      navigate("/find-course");
      return;
    }
    setShortlistOpen(true);
  }

  return (
    <div className="app">
      <HomeBanner />
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 16,
          zIndex: 2000,
          width: "min(320px, 90vw)",
        }}
      >
        <button
          type="button"
          onClick={handleShortlistNow}
          style={{
            background: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "12px 18px",
            fontWeight: 800,
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
          }}
        >
          Shortlist Now
        </button>
      </div>
      <div className="section section-featured">
        <FeaturedUniversities />
      </div>
      <div className="section section-guidance">
        <GuidanceHome />
      </div>
      <div className="section section-concentration">
        <FindByConcentration />
      </div>
      <div className="section section-how">
        <HowWeWork />
      </div>
      <div className="section section-counsellors">
        <MeetCounsellors />
      </div>
      <div className="section section-events">
        <EventsTimeline />
      </div>
      <ShortlistModal open={shortlistOpen} onClose={() => setShortlistOpen(false)} />
    </div>
  );
}
