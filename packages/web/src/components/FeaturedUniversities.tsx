import { useEffect, useMemo, useState } from "react";
import { fetchFeatured, type FeaturedUniversity } from "../lib/api";
import "../App.css";

export default function FeaturedUniversities() {
  const [items, setItems] = useState<FeaturedUniversity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchFeatured()
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  const visible = useMemo(
    () => (expanded ? items : items.slice(0, 8)),
    [items, expanded],
  );

  if (error || !items.length) return null;

  return (
    <section className="featured-block">
      <div className="featured-header">
        <h2>Apply to 500+ Universities</h2>
        <p>Get Exclusive Discounts on Application & VISA Fees</p>
      </div>

      <div className="featured-table">
        <div className="featured-head">
          <div>Universities</div>
          <div>Application Fees</div>
          <div>Discount</div>
          <div>Action</div>
        </div>
        <div className="featured-body">
          {visible.map((item) => (
            <div className="featured-row" key={item.id}>
              <div className="featured-cell uni">
                <img
                  src={
                    item.universityImage ||
                    `https://flagcdn.com/48x36/${item.countryIso.toLowerCase()}.png`
                  }
                  alt={item.universityName}
                  className="featured-logo"
                />
                <div>
                  <div className="featured-name">{item.universityName}</div>
                  <div className="featured-sub">{item.programName}</div>
                </div>
              </div>
              <div className="featured-cell fee">
                <span className="badge">%</span>
                <span className="amount">
                  {item.applicationFee != null
                    ? `${item.applicationFee}$`
                    : "N/A"}
                </span>
              </div>
              <div className="featured-cell discount">
                <span className="discount-tag">
                  {item.discount ? `${item.discount}%` : "—"}
                </span>
              </div>
              <div className="featured-cell action">
                <button type="button" className="outline-btn">
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="featured-footer">
        <button
          type="button"
          className="outline-btn wide"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Explore Less" : "Explore More"}
        </button>
      </div>
    </section>
  );
}
