import { useState } from "react";
import "./NewsletterBar.css";

export default function NewsletterBar() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:6942"}/api/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: phone || "newsletter" }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(() => {
        setMessage("Subscribed successfully!");
        setEmail("");
        setPhone("");
      })
      .catch((err) => setError(err.message || "Subscription failed"))
      .finally(() => setLoading(false));
  };

  return (
    <section className="newsletter">
      <div className="newsletter__inner">
        <div className="newsletter__heading">
          <h2>Subscribe to our Newsletter</h2>
          <div className="newsletter__tags">
            <span>College Notifications</span>
            <span>Exam Notifications</span>
            <span>News Updates</span>
          </div>
        </div>
        <form className="newsletter__form" onSubmit={handleSubmit}>
          <input
            className="newsletter__input"
            placeholder="Enter your email id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="newsletter__input"
            placeholder="+91 Enter your mobile no"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
          <button className="newsletter__submit" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
        {message && <div className="newsletter__success">{message}</div>}
        {error && <div className="newsletter__error">{error}</div>}
      </div>
    </section>
  );
}
