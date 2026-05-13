import { useRole } from "../context/RoleContext";
import { 
  AlertCircle, Sparkles, Brain, Zap, ChevronRight, 
  BarChart3, Target, User
} from "lucide-react";
import profilePic from "../../imports/people-showing-support-respect-with-yellow-background-suicide-prevention-day_23-2151607941.jpg";
import { useNavigate } from "react-router";

export function Home() {
  const { isManager } = useRole();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-700 font-['DM_Sans'] pb-12">
      
      {/* 1. WELCOME BANNER (NOVO LAYOUT HORIZONTAL FLUIDO) */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FF7C6B]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <img src={profilePic} alt="Ana Maria" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover shrink-0 relative z-10" />
        
        <div className="flex flex-col flex-1 relative z-10 w-full text-center md:text-left">
          <h1 className="text-3xl lg:text-4xl font-black text-[#2D2A96] tracking-tight mb-2">Hi, Ana Maria! 👋</h1>
          <p className="text-gray-500 font-medium text-sm md:text-base mb-6">
            Welcome to your career portal. Ready to reach your next goals?
          </p>
          
          {/* Barra Horizontal de Detalhes */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mr-2">
              <User size={14} /> Your Details:
            </span>
            
            <DetailInline label="Role" value="Product Manager • Senior (L4)" />
            <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
            
            <DetailInline label="CI&Ter Since" value="2021 (5 anos)" />
            <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
            
            <DetailInline label="Area" value="People" />
            <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
            
            <DetailInline label="GU" value="Enterprise" />
            <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
            
            <DetailInline label="Manager" value="@gbasile" />
            <div className="hidden sm:block w-px h-3 bg-gray-300"></div>
            
            <DetailInline label="HR BP" value="@cmiele" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO ESQUERDO (Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active Cycle Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF7C6B]/10 text-[#FF7C6B] rounded-lg text-[10px] font-black uppercase tracking-widest mb-6 w-max">
              <div className="w-2 h-2 rounded-full bg-[#FF7C6B] animate-pulse" /> Active Cycle: Q2 2026
            </div>
            <h3 className="text-2xl font-black text-[#2D2A96] mb-2">Feedback Collection</h3>
            <p className="text-sm text-gray-600 mb-8 leading-relaxed">We are currently in the continuous feedback phase. Request 360º evaluations to build your track record for the quarter.</p>
            
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-inner">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quarter Progress</span>
                <span className="text-lg font-black text-[#2D2A96]">34 days <span className="text-xs font-bold text-gray-500">left</span></span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden"><div className="bg-[#FF7C6B] h-full rounded-full w-[40%]" /></div>
            </div>
          </div>

          {/* AI Highlight & Network Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AI Weekly Insight */}
            <div className="bg-[#2D2A96] rounded-2xl p-6 shadow-sm border border-[#24217D] text-white flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
               <Sparkles className="absolute top-4 right-4 text-white/10 w-20 h-20 -rotate-12 transition-transform group-hover:rotate-0 duration-500" />
               <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2"><Brain size={14}/> AI Weekly Insight</h4>
                 <p className="text-sm font-medium text-indigo-50 leading-relaxed italic">"You've received positive mentions this week regarding your conflict resolution skills during the squad retrospective."</p>
               </div>
               <button onClick={() => navigate('/performance-cycle')} className="mt-4 text-[10px] uppercase tracking-widest font-black text-[#FF7C6B] flex items-center gap-1 hover:text-white transition-colors w-max">
                 View Full Insights <ChevronRight size={14} />
               </button>
            </div>

            {/* Network Connections Radar */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
               <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-2"><Zap size={14} className="text-amber-500"/> Network Radar</h4>
                 <p className="text-xs text-gray-600 font-medium mb-4">You've recently collaborated with these peers heavily. Request feedback for Q2!</p>
                 <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                       <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[#2D2A96] text-xs font-black z-30">CB</div>
                       <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-700 text-xs font-black z-20">ML</div>
                       <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-amber-700 text-xs font-black z-10">PR</div>
                    </div>
                 </div>
               </div>
               <button onClick={() => navigate('/performance-cycle')} className="mt-4 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-[#2D2A96] text-[10px] uppercase tracking-widest font-black rounded-lg border border-gray-200 transition-colors">
                 Ask for Feedback
               </button>
            </div>

          </div>

        </div>

        {/* LADO DIREITO (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full">
          
          {/* Priorities Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-black text-[#2D2A96] flex items-center gap-2"><AlertCircle size={20} className="text-[#FF7C6B]" /> Your Priorities</h3>
              <button className="text-[10px] uppercase tracking-widest font-black text-indigo-500 hover:text-indigo-700 transition-colors">View all</button>
            </div>
            
            <div className="space-y-3">
               <ActionItem title="Review Pending Assessments (2)" desc="Carlos Beta and Marina Lima requested your feedback." urgent />
               <ActionItem title="Consolidate Insights (Maria Souza)" desc="AI generated a semester summary. Review before the 1-on-1." />
               {isManager && <ActionItem title="Calibration Prep (Enterprise Tribe)" desc="Set the Q2 9-Box position for your 12 direct reports." />}
            </div>
          </div>

          {/* Development Focus */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-between group cursor-pointer hover:border-[#2D2A96]/30 transition-all">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-[#FF7C6B] shadow-sm group-hover:scale-110 transition-transform"><Target size={24} /></div>
                <div>
                   <h4 className="text-sm font-black text-[#2D2A96]">Your Development Focus</h4>
                   <p className="text-xs text-gray-500 font-medium mt-0.5">Continue working on your IDP goals.</p>
                </div>
             </div>
             <ChevronRight size={20} className="text-gray-300 group-hover:text-[#2D2A96] transition-colors" />
          </div>

        </div>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function DetailInline({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}:</span>
      <span className="text-xs font-black text-[#2D2A96]">{value}</span>
    </div>
  );
}

function ActionItem({ title, desc, urgent }: any) {
  return (
    <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all hover:shadow-md cursor-pointer ${urgent ? 'bg-[#FF7C6B]/5 border-[#FF7C6B]/20 hover:border-[#FF7C6B]/40' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${urgent ? 'bg-[#FF7C6B] text-white' : 'bg-gray-100 text-gray-400'}`}>
        {urgent ? <AlertCircle size={18} /> : <BarChart3 size={18} />}
      </div>
      <div className="flex-1">
        <h4 className={`font-black text-sm mb-0.5 ${urgent ? 'text-gray-900' : 'text-[#2D2A96]'}`}>{title}</h4>
        <p className="text-xs text-gray-500 font-medium leading-snug">{desc}</p>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </div>
  );
}