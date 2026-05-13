import { Calendar as CalendarIcon, Clock, ChevronRight, CheckCircle2, Circle } from "lucide-react";

export function Calendar() {
  const events = [
    { month: "Jan - Mar", status: "completed", title: "Q1 Continuous Feedback", desc: "SLA 10 days for chat collections. AI tensions collected answers." },
    { month: "Apr - Jun", status: "current", title: "Q2 Self-Evaluation", desc: "Collaborators fill out their self-assessment forms." },
    { month: "July", status: "upcoming", title: "AI Consolidation & Manager Review", desc: "AI consolidates insights. PDM makes deep analysis (180º)." },
    { month: "August", status: "upcoming", title: "Calibration", desc: "Committee alignment of the bar and 9-box positioning." },
    { month: "September", status: "upcoming", title: "Final 180 Devolution", desc: "Present outcome and set goals for the new cycle." },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#201E73] flex items-center gap-3">
            <CalendarIcon className="text-[#E26C1C]" /> Annual Performance Cycle
          </h1>
          <p className="text-gray-500 mt-2">Track important milestones and deadlines for the current year.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-8 border-b border-gray-100 pb-4">
          2026 Schedule
        </h2>

        <div className="space-y-6">
          {events.map((ev, i) => (
            <div 
              key={i} 
              className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-all ${
                ev.status === "current" 
                  ? "border-[#E26C1C] bg-[#E26C1C]/5 shadow-md scale-[1.02]" 
                  : ev.status === "completed"
                  ? "border-gray-100 bg-gray-50 opacity-75"
                  : "border-transparent hover:border-gray-100 hover:bg-gray-50"
              }`}
            >
              <div className="mt-1 shrink-0">
                {ev.status === "completed" && <CheckCircle2 className="text-[#201E73]" size={28} />}
                {ev.status === "current" && <Clock className="text-[#E26C1C] animate-pulse" size={28} />}
                {ev.status === "upcoming" && <Circle className="text-gray-300" size={28} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-sm font-bold uppercase ${
                    ev.status === "current" ? "text-[#E26C1C]" : "text-gray-500"
                  }`}>
                    {ev.month}
                  </span>
                  {ev.status === "current" && (
                    <span className="text-xs bg-[#E26C1C] text-white px-2 py-0.5 rounded-full font-bold">
                      Current Stage
                    </span>
                  )}
                </div>
                <h3 className={`font-bold text-lg ${ev.status === "completed" ? "text-gray-600 line-through decoration-2 decoration-gray-400" : "text-[#201E73]"}`}>
                  {ev.title}
                </h3>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed">{ev.desc}</p>
              </div>
              
              <div className="shrink-0 flex items-center h-full pt-4">
                <ChevronRight className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}