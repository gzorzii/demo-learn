import { History as HistoryIcon, Award, MessageSquare, ChevronRight, FileText } from "lucide-react";

export function History() {
  const pastCycles = [
    { year: "2025", quarter: "Q4", type: "Annual Review", outcome: "Exceeds", date: "Jan 2026" },
    { year: "2024", quarter: "Q4", type: "Annual Review", outcome: "Meets", date: "Jan 2025" },
  ];

  return (
    <div className="max-w-[1000px] mx-auto pb-16 space-y-8 font-['DM_Sans'] animate-in fade-in duration-700">
      <div className="bg-[#201E73] rounded-[2rem] p-10 text-white relative overflow-hidden shadow-lg">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
         <div className="relative z-10">
           <h1 className="text-3xl font-black tracking-tight mb-2">Official History</h1>
           <p className="text-indigo-200 text-sm font-medium max-w-xl">Immutable record of your closed evaluation cycles and crystallized feedbacks. Use this to track your longitudinal growth.</p>
         </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-black text-[#201E73] mb-6 flex items-center gap-3">
          <Award size={24} className="text-[#fd6e5e]" /> Past Annual Results
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {pastCycles.map((cycle, i) => (
            <div key={i} className="flex flex-col p-6 bg-gray-50/80 rounded-3xl border border-gray-100 hover:border-[#201E73]/30 transition-all group cursor-pointer hover:shadow-md">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-200">{cycle.date}</span>
                <span className="bg-[#201E73] text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Final Outcome</span>
              </div>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <div className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">{cycle.type}</div>
                  <div className="text-2xl font-black text-gray-800">{cycle.year} {cycle.quarter}</div>
                </div>
                <div className={`text-xl font-black ${cycle.outcome === 'Exceeds' ? 'text-green-600' : 'text-indigo-600'}`}>{cycle.outcome}</div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-200 flex justify-end">
                <span className="text-xs font-black text-indigo-500 flex items-center gap-1 group-hover:text-indigo-700 transition-colors">
                  View Full Details <ChevronRight size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}