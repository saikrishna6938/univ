import { useEffect, useState } from "react";
import ShortlistModal from "./ShortlistModal";
import "./MeetCounsellors.css";

type Counsellor = { name: string; title: string; image: string };

export default function MeetCounsellors() {
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    import("../data/counsellors.json").then((mod) => setCounsellors(mod.default as Counsellor[]));
  }, []);

  if (!counsellors.length) return null;

  const bgGradients = [
    "linear-gradient(135deg, #fde68a, #fca5a5)",
    "linear-gradient(135deg, #a5f3fc, #d8b4fe)",
    "linear-gradient(135deg, #fbcfe8, #c7d2fe)",
    "linear-gradient(135deg, #fef3c7, #bfdbfe)",
    "linear-gradient(135deg, #ddd6fe, #c4b5fd)",
    "linear-gradient(135deg, #bae6fd, #c7d2fe)",
    "linear-gradient(135deg, #fecdd3, #fee2e2)",
    "linear-gradient(135deg, #e0f2fe, #c7d2fe)"
  ];

  return (
    <>
      <section className="counsellors">
        <div className="counsellors__header">
          <h2>
            Meet Our <span>Counsellors</span>
          </h2>
        </div>
        <div className="counsellors__grid">
          {counsellors.map((c, i) => (
            <div className="counsellors__card" key={c.name} style={{ background: bgGradients[i % bgGradients.length] }}>
              <img src={c.image} alt={c.name} className="counsellors__photo" />
              <div className="counsellors__name">{c.name}</div>
              <div className="counsellors__title">{c.title}</div>
              <button className="counsellors__btn" onClick={() => setOpen(true)}>
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      </section>
      <ShortlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
