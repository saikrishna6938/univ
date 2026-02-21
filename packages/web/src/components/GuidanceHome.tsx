import "./GuidanceHome.css";

const items = [
  {
    title: "Profile Evaluation",
    desc: "Share your academic and career background, and we map out realistic program options for your goals.",
    cta: "Get Started",
    icon: "🧭",
  },
  {
    title: "Admission Guidance",
    desc: "Work with our team to finalize the right country, university, and course based on your profile and budget.",
    cta: "Talk to an Expert",
    icon: "🎓",
  },
  {
    title: "Test Prep & Webinar",
    desc: "Get preparation support for major tests and attend focused sessions on requirements and deadlines.",
    cta: "Join Session",
    icon: "🧠",
  },
  {
    title: "Application Document & Essay",
    desc: "Build a complete application pack with structured help for SOPs, essays, and supporting documents.",
    cta: "Prepare Documents",
    icon: "📝",
  },
  {
    title: "Visa & Interview",
    desc: "Receive step-by-step visa documentation help and interview practice tailored to your destination.",
    cta: "Plan Visa",
    icon: "🛂",
  },
  {
    title: "Scholarships & Financial Aid",
    desc: "Understand total costs, funding options, and scholarship opportunities before you finalize your admit.",
    cta: "Explore Funding",
    icon: "💰",
  },
];

export default function GuidanceHome() {
  return (
    <section className="guidance">
      <div className="guidance__header">
        <h2>End-to-End Student Guidance</h2>
        <p>
          Gradwalk supports you through each stage of the process, from choosing the right program to submitting strong
          applications and preparing for your visa.
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
