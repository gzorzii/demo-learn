import { HelpCircle, ChevronDown, BookOpen, MessageCircle } from "lucide-react";
import { useState } from "react";

export function FAQ() {
  const faqs = [
    { q: "How does Continuous Feedback (360) work?", a: "Every 3 months, you're required to request feedback from your peers. Our AI (ONA) suggests people based on your interactions. The feedback is collected via conversational chat with a 10-day SLA and AI tensions the answers to extract real evidence." },
    { q: "What is the role of AI in the Performance Review?", a: "AI consolidates insights from your continuous feedback into three pillars: Results, Tech, and Culture. It then tensions your leader's scores by crossing them with your seniority and history to reduce bias and anchor evaluations in real evidence." },
    { q: "What happens during Calibration?", a: "The calibration process involves a committee of leaders aligning the evaluation bar. They review the AI's proposed outcome and position collaborators on the 9-Box matrix to make fair career and promotion decisions." },
    { q: "What are the outcome concepts?", a: "There are four possible outcomes for the annual review: Abaixo (Below), Em desenvolvimento (Developing), Atende (Meets), and Supera (Exceeds)." },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#201E73] flex items-center gap-3">
          <BookOpen className="text-[#EBC512]" /> Methodology & FAQ
        </h1>
        <p className="text-gray-500 mt-2">Learn about the CI&T Perform methodology and find answers to common questions.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-indigo-50">
          <h2 className="text-xl font-bold text-[#201E73] mb-4">Core Principles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <PrincipleCard title="Agile Evidence" desc="Feedback is collected conversationally via chat to capture real-time, concrete evidence." />
            <PrincipleCard title="AI Powered" desc="Artificial Intelligence reduces bias by anchoring scores in seniority and historical patterns." />
            <PrincipleCard title="Fair Calibration" desc="9-box positioning and committee alignment ensure standardized evaluation bars." />
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <HelpCircle className="text-[#E26C1C]" /> Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden transition-all">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-[#201E73]"
                >
                  <span className={`font-bold ${open === i ? "text-[#E26C1C]" : "text-gray-700"}`}>
                    {faq.q}
                  </span>
                  <ChevronDown className={`transition-transform text-gray-400 ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="p-4 pt-0 text-gray-600 bg-white border-t border-gray-100 leading-relaxed text-sm">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-[#201E73] rounded-xl text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">Still need help?</h3>
              <p className="text-gray-300 text-sm">Contact our People support team for further methodology details.</p>
            </div>
            <button className="bg-[#EBC512] hover:bg-[#d4b00c] text-[#201E73] font-bold px-6 py-3 rounded-lg flex items-center gap-2 shadow-md transition-colors">
              <MessageCircle size={18} /> Chat with Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrincipleCard({ title, desc }: any) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
      <h3 className="font-bold text-[#201E73] text-sm mb-2 uppercase tracking-wide">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}