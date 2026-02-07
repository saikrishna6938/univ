import "./GuidanceHome.css";

const items = [
  {
    title: "Profile Evaluation",
    desc: "Once you submit your application, our expert team evaluates your profile on education, work exp. & objectives",
    cta: "Register Now",
    icon: "🧭",
  },
  {
    title: "Admission Guidance",
    desc: "Counsellors help you identify the right country, college and program or arrange mentorship from existing students",
    cta: "Get Mentorship",
    icon: "🎓",
  },
  {
    title: "Test Prep & Webinar",
    desc: "Free tips and tricks to crack IELTS, TOEFL, DET, SAT, GRE, GMAT plus cut‑off scores for top universities.",
    cta: "Register For Webinar",
    icon: "🧠",
  },
  {
    title: "Application Document & Essay",
    desc: "We check every application & essay before submitting and assist you at each step while preparing documents.",
    cta: "Avail Services",
    icon: "📝",
  },
  {
    title: "Visa & Interview",
    desc: "With top visa approval rates, our team guides you on the best ways to earn a study visa at your dream destination.",
    cta: "Get Information",
    icon: "🛂",
  },
  {
    title: "Scholarships & Financial Aid",
    desc: "We guide you on expenses, internships, education loans, and scholarships to fund your studies.",
    cta: "Find Scholarships",
    icon: "💰",
  },
];

export default function GuidanceHome() {
  return (
    <section className="guidance">
      <div className="guidance__header">
        <h2>Free Counselling: Let Us Guide You</h2>
        <p>
          Looking into study abroad colleges and universities as an international student can be a challenge, but it's one
          you can overcome! From how to look for accredited schools to what you should write about on your applications,
          our expert counsellors will help you at every step.
        </p>
      </div>
      <div className="guidance__grid">
        {items.map((item) => (
          <div className="guidance__card" key={item.title}>
            <div className="guidance__icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
            <button type="button" className="guidance__btn">
              {item.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
