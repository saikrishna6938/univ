import { useEffect, useMemo, useState } from "react";
import "./FindByConcentration.css";

type ConcentrationItem = {
  concentration: string;
  programsCount: number;
};

export default function FindByConcentration() {
  const [items, setItems] = useState<ConcentrationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:6942"}/api/concentrations`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.programsCount || 0) - (a.programsCount || 0)),
    [items]
  );

  const visible = useMemo(() => (expanded ? sorted : sorted.slice(0, 8)), [sorted, expanded]);

  if (error || !items.length) return null;

  return (
    <section className="concentration">
      <div className="concentration__header">
        <h2>Explore Programs by Interest Area</h2>
        <p>
          Browse top study areas and quickly see where the most program options are available for your goals.
        </p>
      </div>
      <div className="concentration__grid">
        {visible.map((item, idx) => (
          <div className="concentration__card" key={item.concentration + idx}>
            <div className="concentration__icon">🎯</div>
            <div className="concentration__title">{item.concentration}</div>
            <div className="concentration__count">{item.programsCount} Colleges</div>
          </div>
        ))}
      </div>
      <div className="concentration__footer">
        <button type="button" className="concentration__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Explore Less" : "Explore More"}
        </button>
      </div>
    </section>
  );
}
