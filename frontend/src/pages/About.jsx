import { Link } from 'react-router-dom';
import { Target, Users, ShieldCheck, HeartHandshake, HelpCircle } from 'lucide-react';

export default function About() {
  const values = [
    {
      icon: Target,
      title: "Direct Accountability",
      description: "By creating transparent tracking pipelines, we bridge the communication gap between citizens and local municipality maintenance crews."
    },
    {
      icon: Users,
      title: "Crowdsourced Priority",
      description: "Upvoting enables neighborhood residents to collectively highlight which safety issues need the most immediate municipal attention."
    },
    {
      icon: ShieldCheck,
      title: "Verified Action",
      description: "Every resolved report includes visual checkouts or logs from inspectors on-site, ensuring work is completed to quality standards."
    }
  ];

  const faqs = [
    {
      question: "How does Community Hero submit reports to the city?",
      answer: "Community Hero packages reported issues into structured complaints, attaching geo-coordinates and category tags. These are routed to the corresponding municipal departments (e.g., Public Works, Parks and Recreation) via our partners' service integrations."
    },
    {
      question: "Is my personal data visible to the public?",
      answer: "No. Your contact information is never displayed publicly on the platform. Other community members will only see your display name as the reporter, and municipal teams only use your email to request clarifications if necessary."
    },
    {
      question: "What should I do in case of an immediate emergency?",
      answer: "Community Hero is designed for non-emergency public maintenance and safety reports. If you encounter an immediate danger, gas leak, active fire, or crime, please call 911 or your local emergency services hotline immediately."
    },
    {
      question: "How can my city officially partner with Community Hero?",
      answer: "We offer municipal dashboard access, API webhooks, and priority dispatching integrations for cities. Representatives can reach out to our partnerships team via email at partnerships@communityhero.org to request a pilot setup."
    }
  ];

  return (
    <div className="flex-grow bg-white text-zinc-800">
      {/* Introduction Mission Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-5xl font-black text-zinc-950 tracking-tight leading-tight font-display">
              Bridging the Gap Between <br />
              <span className="bg-gradient-to-r from-zinc-950 via-zinc-850 to-zinc-600 bg-clip-text text-transparent">
                Neighbors & Neighborhoods
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-550 leading-relaxed max-w-2xl mx-auto">
              Founded in 2026, Community Hero started as a simple idea: that residents shouldn't feel powerless when local infrastructure fails. We empower people to snap, submit, and solve local problems collectively.
            </p>
          </div>
        </div>
      </section>

      {/* Grid of Values */}
      <section className="py-16 bg-zinc-50 border-y border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-2 font-display">Our Operating Core</h2>
            <p className="text-zinc-500 text-sm">Three core tenets that drive our civic platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((val) => {
              const Icon = val.icon;
              return (
                <div key={val.title} className="p-6 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-350 transition-all text-left shadow-sm">
                  <div className="p-2.5 bg-zinc-100 rounded-lg w-fit text-zinc-900 mb-5 border border-zinc-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 mb-3 font-display">{val.title}</h3>
                  <p className="text-xs sm:text-sm text-zinc-550 leading-relaxed">{val.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-2 flex items-center justify-center space-x-2 font-display">
              <HelpCircle className="h-6 w-6 text-zinc-900" />
              <span>Frequently Asked Questions</span>
            </h2>
            <p className="text-zinc-550 text-sm">Everything you need to know about report flows and security.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2 text-left">
                <h3 className="text-base font-bold text-zinc-900 font-display">
                  {faq.question}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-550 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Wrapper */}
      <section className="py-16 text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 sm:p-12 space-y-6 max-w-4xl mx-auto shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 font-display">Ready to become a local hero?</h2>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed">
            Take two minutes to submit your first civic alert. Help us make your block the safest, cleanest, and most active it can be.
          </p>
          <div>
            <Link
              to="/report"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all shadow-sm cursor-pointer"
            >
              <HeartHandshake className="h-4 w-4" />
              <span>Report Your First Issue</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
