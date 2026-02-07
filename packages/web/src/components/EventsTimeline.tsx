import { useEffect, useMemo, useState } from "react";
import uniIcon from "../assets/university-placeholder.svg";
import "./EventsTimeline.css";

type EventRow = { title: string; date: string };
type UniEvent = {
  degree: string;
  program: string;
  university: string;
  logo: string;
  events: EventRow[];
};

export default function EventsTimeline() {
  const [data, setData] = useState<UniEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:6942"}/api/events`,
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const degrees = useMemo(
    () => ["All", ...Array.from(new Set(data.map((d) => d.degree)))],
    [data],
  );
  const filtered = useMemo(
    () => (filter === "All" ? data : data.filter((d) => d.degree === filter)),
    [data, filter],
  );

  if (error || !data.length) return null;

  return (
    <section className="events">
      <div className="events__header">
        <h2>Application Deadline</h2>
        <div className="events__chips">
          {degrees.map((deg) => (
            <button
              key={deg}
              className={`chip ${deg === filter ? "active" : ""}`}
              onClick={() => setFilter(deg)}
            >
              {deg}
            </button>
          ))}
        </div>
      </div>

      <div className="events__table">
        <div className="events__head">
          <div>University</div>
          <div>Event</div>
          <div>Important Dates</div>
        </div>

        {filtered.map((item, idx) => (
          <div
            className={`events__row ${idx === 0 ? "highlight" : ""}`}
            key={item.program + idx}
          >
            <div className="events__uni">
              <img src={uniIcon} alt="University" />
              <div>
                <div className="events__program">{item.program}</div>
                <div className="events__university">{item.university}</div>
              </div>
            </div>
            <div className="events__events">
              {item.events.map((ev, i) => (
                <div className="events__eventrow" key={ev.title + i}>
                  <span className="events__icon">✴︎</span>
                  <span>{ev.title}</span>
                </div>
              ))}
            </div>
            <div className="events__dates">
              {item.events.map((ev, i) => (
                <div className="events__date" key={ev.title + i}>
                  {new Date(ev.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
