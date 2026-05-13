import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useRole } from '../context/RoleContext';
import { 
  MessageCircle, Brain, Send, Users, 
  Check, ShieldCheck, UserPlus, Inbox, Clock, 
  CalendarDays, Sparkles, Target, Square, CheckSquare, Code, 
  ThumbsUp, BarChart3, CheckCircle2, X,
  Eye, Hourglass, FileSignature, ClipboardList, ListChecks
} from 'lucide-react';

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const TIMELINE_PHASES: { label: QuarterKey; description: string; highlight?: boolean }[] = [
  { label: 'Q1', description: 'Continuous Feedback' },
  { label: 'Q2', description: 'Continuous Feedback' },
  { label: 'Q3', description: 'Continuous Feedback' },
  { label: 'Q4', description: 'Performance Review', highlight: true },
];

function phaseStatus(label: QuarterKey, current: QuarterKey): 'done' | 'active' | 'locked' {
  const order: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const ki = order.indexOf(label);
  const ci = order.indexOf(current);
  if (ki < ci) return 'done';
  if (ki === ci) return 'active';
  return 'locked';
}

/** Year rail aligned to quarter centers (12.5% … 87.5%); fill grows with simulated quarter.
 *  Rails use z-0 / z-[1] (never negative): -z-index would paint behind the card’s white fill and disappear. */
function CycleQuarterTimeline({ currentQuarter }: { currentQuarter: QuarterKey }) {
  const order: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const ci = Math.max(0, order.indexOf(currentQuarter));

  return (
    <div className="relative isolate mx-auto max-w-4xl px-2 pb-1 pt-2 sm:px-8">
      {/* Full baseline linking Q1–Q4 (visible gray track through circle centers) */}
      <div
        className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[22px] z-0 h-[3px] rounded-full bg-gray-200 sm:h-1"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[12.5%] top-[22px] z-[1] h-[3px] rounded-full bg-gradient-to-r from-[#201E73] to-[#5c59a8] transition-all duration-700 ease-out sm:h-1"
        style={{ width: `${(ci / 3) * 75}%` }}
        aria-hidden
      />

      <div className="relative z-10 flex justify-between items-start gap-1">
        {TIMELINE_PHASES.map((phase) => {
          const st = phaseStatus(phase.label, currentQuarter);
          const isActive = st === 'active';
          const isDone = st === 'done';

          return (
            <div key={phase.label} className="relative flex flex-col items-center flex-1 min-w-0 max-w-[7.5rem] mx-auto pt-0">
              {isActive && (
                <div className="absolute -top-10 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <span className="whitespace-nowrap rounded-md bg-[#FD6E5E] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-lg">
                    You are here
                  </span>
                  <div className="-mt-1 h-2 w-2 rotate-45 bg-[#FD6E5E]" />
                </div>
              )}

              <div
                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 text-xs font-black shadow-sm transition-all duration-500 ${
                  isDone
                    ? 'border-[#6E6EC4] bg-[#6E6EC4] text-white'
                    : isActive
                      ? 'scale-110 border-white bg-[#FD6E5E] text-white shadow-md ring-4 ring-[#FD6E5E]/30'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isDone ? <Check size={18} strokeWidth={3} className="shrink-0" /> : <span>{phase.label}</span>}
              </div>

              <div className="mt-4 space-y-1 text-center">
                <span
                  className={`block text-[10px] font-black uppercase tracking-widest ${
                    isActive ? 'text-[#FD6E5E]' : isDone ? 'text-[#6E6EC4]' : 'text-gray-400'
                  }`}
                >
                  {phase.label}
                </span>
                <div
                  className={`text-[9px] font-bold leading-tight transition-colors ${
                    phase.highlight ? 'rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-amber-800' : 'text-gray-500'
                  }`}
                >
                  {phase.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Direct reports — manager hub for the cycle */
const MANAGER_DIRECT_REPORTS = [
  {
    id: 201,
    name: 'Ana Maria Lopes',
    role: 'Product Manager',
    signals: 18,
    themes: ['Stakeholder clarity', 'Delivery cadence', 'Product mentorship'],
    box: 'Star',
    lastTouch: '9 days ago',
  },
  {
    id: 202,
    name: 'Carlos Beta',
    role: 'Tech Lead',
    signals: 12,
    themes: ['Architecture', 'Technical prioritization', 'Pairing'],
    box: 'Core',
    lastTouch: '22 days ago',
  },
  {
    id: 203,
    name: 'Diana Silva',
    role: 'QA Engineer',
    signals: 9,
    themes: ['Quality culture', 'Automation', 'QA communication'],
    box: 'Core',
    lastTouch: '14 days ago',
  },
  {
    id: 204,
    name: 'Pedro Rocha',
    role: 'Backend Dev',
    signals: 15,
    themes: ['Stable APIs', 'Documentation', 'Incident ownership'],
    box: 'High Perf',
    lastTouch: '7 days ago',
  },
];

export function PerformanceCycle() {
  const { isManager } = useRole();
  const [currentQuarter, setCurrentQuarter] = useState<'Q1'|'Q2'|'Q3'|'Q4'>('Q2');
  const [activeTab, setActiveTab] = useState<
    'request' | 'inbox' | 'track' | 'chat' | 'insights' | 'eval' | 'team'
  >('request');
  const [chatPeerId, setChatPeerId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [managerChatOpen, setManagerChatOpen] = useState(false);
  const [managerChatCtx, setManagerChatCtx] = useState<{
    member: (typeof MANAGER_DIRECT_REPORTS)[0];
    mode: 'feedback' | 'review';
  } | null>(null);
  const [managerSuccessKind, setManagerSuccessKind] = useState<'feedback' | 'review' | null>(null);

  useEffect(() => {
    if (!isManager && activeTab === 'team') setActiveTab('request');
  }, [isManager, activeTab]);

  // MOCK DATA ROBUSTO
  const [requests, setRequests] = useState([
    { id: 1, name: "Carlos Beta", role: "Tech Lead", context: "Q2 Deliverables", sla: "3 days left", status: 'pending', source: 'Direct Team' },
    { id: 2, name: "Marina Lima", role: "UX Designer", context: "Design System", sla: "5 days left", status: 'pending', source: 'Direct Team' },
    { id: 3, name: "Pedro Rocha", role: "Backend Dev", context: "API Refactoring", sla: "Overdue", status: 'pending', source: 'Direct Team' },
    { id: 4, name: "Sérgio Ramos", role: "Tribe Lead", context: "Q2 Planning", sla: "2 days left", status: 'accepted', source: 'AI Suggested' },
    { id: 5, name: "Beatriz Nogueira", role: "Ops Manager", context: "Cloud Migration", sla: "7 days left", status: 'declined', source: 'AI Suggested' },
    { id: 6, name: "Gabriel S.", role: "Staff Engineer", context: "Architecture Review", sla: "1 day left", status: 'pending', source: 'AI Suggested' },
    { id: 7, name: "Marta Silva", role: "Business Analyst", context: "Product Discovery", sla: "8 days left", status: 'pending', source: 'AI Suggested' },
    { id: 8, name: "Lucas Mendes", role: "Mobile Dev", context: "Auth Module", sla: "4 days left", status: 'pending', source: 'Direct Team' },
    { id: 9, name: "Camila Miele", role: "HR Partner", context: "Culture Survey", sla: "Completed", status: 'accepted', source: 'Direct Team' },
    { id: 10, name: "Julia Barros", role: "Product Manager", context: "Roadmap Q3", sla: "6 days left", status: 'pending', source: 'AI Suggested' },
  ]);

  const isReviewPhase = currentQuarter === 'Q4';

  return (
    <div className="max-w-[1100px] mx-auto pb-10 px-4 sm:px-6 space-y-6 font-['DM_Sans'] text-sm text-gray-700 leading-normal animate-in fade-in duration-700 bg-[#F8F9FA] min-h-[calc(100vh-6rem)] rounded-2xl">
      
      {/* HEADER & TIMELINE */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 relative z-10">
          <div className="max-w-2xl min-w-0">
            <h1 className="text-2xl font-black text-[#201E73] tracking-tight mb-1.5">Performance Cycle 2026</h1>
            <p className="text-gray-600 font-medium text-sm leading-snug">
              Track your continuous growth and annual achievements throughout the year.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 py-1.5 pl-2 pr-2 rounded-lg border border-gray-200 shrink-0">
             <CalendarDays size={16} className="text-gray-500 ml-2" />
             <select 
                value={currentQuarter} 
                onChange={(e) => setCurrentQuarter(e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4')} 
                className="bg-transparent border-none text-xs font-bold px-2 py-1.5 text-[#201E73] outline-none cursor-pointer max-w-[11rem]"
              >
                <option value="Q1">Simulate: Q1</option>
                <option value="Q2">Simulate: Q2</option>
                <option value="Q3">Simulate: Q3</option>
                <option value="Q4">Simulate: Q4</option>
             </select>
          </div>
        </div>

        {/* Timeline — linear rail; fill width follows simulated quarter (fixes hardcoded 33%) */}
        <CycleQuarterTimeline currentQuarter={currentQuarter} />
      </div>

      <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
        {/* SIDEBAR */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          {!isReviewPhase ? (
            <>
              <Tab active={activeTab === 'request'} onClick={() => setActiveTab('request')} icon={UserPlus} label="Request Feedbacks" />
              <Tab active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={Inbox} label="Pending Assessments" alert={requests.some(r => r.status === 'pending')} />
              <Tab active={activeTab === 'track'} onClick={() => setActiveTab('track')} icon={Clock} label="Track Sent Requests" />
              <Tab active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageCircle} label="AI Conversational Chat" />
              <Tab active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={Sparkles} label="My AI Insights" />
              {isManager && (
                <Tab active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Leadership hub" />
              )}
            </>
          ) : (
             <>
              <Tab active={activeTab === 'eval'} onClick={() => setActiveTab('eval')} icon={ShieldCheck} label={isManager ? "Team Evaluation (180º)" : "Self-Evaluation"} alert />
              <Tab active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={Sparkles} label="Longitudinal AI Insights" />
              {isManager && (
                <Tab active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Leadership hub" />
              )}
             </>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm min-h-[480px] flex flex-col">
          {activeTab === 'request' && <RequestView onSend={() => setShowSuccess(true)} fullRoster={requests} />}
          {activeTab === 'team' && isManager && (
            <ManagerTeamHub
              isReviewPhase={isReviewPhase}
              onOpenFeedbackChat={(member) => {
                setManagerChatCtx({ member, mode: 'feedback' });
                setManagerChatOpen(true);
              }}
              onOpenReviewChat={(member) => {
                setManagerChatCtx({ member, mode: 'review' });
                setManagerChatOpen(true);
              }}
            />
          )}
          {activeTab === 'inbox' && (
            <InboxView
              requests={requests}
              setRequests={setRequests}
              onOpenChat={(peerId) => {
                setChatPeerId(peerId);
                setActiveTab('chat');
              }}
            />
          )}
          {activeTab === 'track' && <TrackView />}
          {activeTab === 'chat' && (
            <ChatView
              acceptedRequests={requests.filter((r) => r.status === 'accepted')}
              focusPeerId={chatPeerId}
              onFocusConsumed={() => setChatPeerId(null)}
            />
          )}
          {activeTab === 'insights' && <InsightsView quarter={currentQuarter} />}
          {activeTab === 'eval' &&
            (isManager ? (
              <ManagerReviewView onOpenTeam={() => setActiveTab('team')} isReviewPhase={isReviewPhase} />
            ) : (
              <SelfEvaluationView />
            ))}
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-4">
           <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-2xl text-center max-w-sm animate-in zoom-in-95">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Check size={28} strokeWidth={3} /></div>
              <h3 className="text-lg font-black text-[#201E73] mb-2">Requests Sent Successfully!</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">Your network has been notified. They have 10 days to respond via the AI Assistant.</p>
              <button onClick={() => setShowSuccess(false)} className="w-full py-3 bg-[#201E73] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#161453] transition-colors">Got it, thanks</button>
           </div>
        </div>
      )}

      <LeadershipChatModal
        open={managerChatOpen && managerChatCtx != null}
        ctx={managerChatCtx}
        onClose={() => {
          setManagerChatOpen(false);
          setManagerChatCtx(null);
        }}
        onComplete={(kind) => {
          setManagerSuccessKind(kind);
          setManagerChatOpen(false);
          setManagerChatCtx(null);
        }}
      />

      {managerSuccessKind != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl animate-in zoom-in-95 border border-gray-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={22} strokeWidth={2.5} />
            </div>
            <h4 className="text-base font-black text-[#201E73] mb-1">
              {managerSuccessKind === 'review' ? 'Review draft saved' : 'Feedback recorded'}
            </h4>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              {managerSuccessKind === 'review'
                ? 'We blended your input with year-to-date insights. You can refine later or move on to calibration.'
                : 'Your note was saved to this person’s continuous development record.'}
            </p>
            <button
              type="button"
              onClick={() => setManagerSuccessKind(null)}
              className="w-full py-2.5 rounded-xl bg-[#201E73] text-white text-sm font-bold hover:bg-[#161453]"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, label, alert }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 py-3 px-3.5 rounded-xl border transition-all text-left min-h-[3rem] group ${
        active ? 'border-[#201E73] bg-[#201E73]/5 shadow-sm' : 'border-transparent bg-white hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`p-2 rounded-lg shrink-0 transition-colors ${active ? 'bg-[#201E73] text-white' : 'bg-gray-100 text-gray-500 group-hover:text-gray-700'}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <span className={`text-xs sm:text-sm font-semibold leading-snug truncate ${active ? 'text-[#201E73]' : 'text-gray-600'}`}>{label}</span>
      </div>
      {alert ? <div className="w-2 h-2 shrink-0 bg-[#fd6e5e] rounded-full" aria-hidden /> : null}
    </button>
  );
}

// 1. REQUEST FEEDBACK
function RequestView({ onSend, fullRoster }: any) {
  const [selected, setSelected] = useState<number[]>([]);
  const team = fullRoster.filter((p: any) => p.source === 'Direct Team');
  const network = fullRoster.filter((p: any) => p.source === 'AI Suggested');
  const teamIds = team.map((p: any) => p.id);
  const networkIds = network.map((p: any) => p.id);

  const handleSelectAll = () => {
    if (selected.length === fullRoster.length) setSelected([]);
    else setSelected(fullRoster.map((p: any) => p.id));
  };

  const toggleSet = (ids: number[], add: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (add) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return [...next];
    });
  };

  const allTeamSelected = teamIds.length > 0 && teamIds.every((id: number) => selected.includes(id));
  const allSuggestedSelected = networkIds.length > 0 && networkIds.every((id: number) => selected.includes(id));

  return (
    <div className="space-y-4 animate-in fade-in h-full flex flex-col min-h-0">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#201E73] leading-tight">Request Feedback</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
              Pick colleagues for your 360° — more perspectives make your impact story sharper.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="inline-flex items-center justify-center gap-1.5 text-[#201E73] font-semibold text-xs hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors border border-gray-200 shrink-0"
          >
            {selected.length === fullRoster.length ? <CheckSquare size={15} /> : <Square size={15} />}
            Select all
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => toggleSet(teamIds, !allTeamSelected)}
            className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            {allTeamSelected ? 'Clear direct team' : 'Select direct team'}
          </button>
          <button
            type="button"
            onClick={() => toggleSet(networkIds, !allSuggestedSelected)}
            className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100/80"
          >
            {allSuggestedSelected ? 'Clear AI picks' : 'Select AI-suggested peers'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar min-h-0">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="shrink-0" /> Direct team ({team.length})
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {team.map((p: any) => (
              <PeerSelect
                key={p.id}
                peer={p}
                active={selected.includes(p.id)}
                onToggle={() =>
                  setSelected((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                }
              />
            ))}
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-[10px] font-bold text-[#fd6e5e] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="shrink-0 text-[#fd6e5e]" /> Smart suggestions ({network.length})
            </h3>
          </div>
          <p className="text-xs text-gray-600 mb-3 font-medium bg-gradient-to-br from-[#fd6e5e]/8 to-indigo-50/40 p-3 rounded-lg border border-[#fd6e5e]/15 leading-snug">
            <span className="font-semibold text-gray-800">A little help from AI:</span> we look at who shows up most alongside you — meetings, chats, and code — and suggest adding them to your feedback request. That keeps your 360° grounded in real collaboration, not buzzwords: people who actually work with you.
          </p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {network.map((p: any) => (
              <PeerSelect
                key={p.id}
                peer={p}
                active={selected.includes(p.id)}
                onToggle={() =>
                  setSelected((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={selected.length === 0}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 ${
          selected.length > 0
            ? 'bg-[#fd6e5e] text-white hover:bg-[#e65c4c] hover:-translate-y-0.5 hover:shadow-md'
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Send size={16} strokeWidth={2} /> Send to {selected.length} {selected.length !== 1 ? 'people' : 'person'}
      </button>
    </div>
  );
}

function PeerSelect({ peer, active, onToggle }: any) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-lg border text-left w-full transition-colors select-none ${
        active ? 'border-[#201E73] bg-[#201E73]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'
      }`}
    >
      <div
        className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${active ? 'bg-[#201E73] border-[#201E73] text-white' : 'border-gray-200 bg-white'}`}
      >
        {active && <Check size={12} strokeWidth={3} />}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-gray-800 text-sm leading-tight truncate">{peer.name}</div>
        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5 truncate">{peer.role}</div>
      </div>
    </button>
  );
}

// 2. INBOX — Pending | Accepted | Declined
function InboxView({
  requests,
  setRequests,
  onOpenChat,
}: {
  requests: any[];
  setRequests: Dispatch<SetStateAction<any[]>>;
  onOpenChat: (peerId: number) => void;
}) {
  const [inboxTab, setInboxTab] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [lastAcceptedId, setLastAcceptedId] = useState<number | null>(null);

  const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
  const acceptedCount = requests.filter((r: any) => r.status === 'accepted').length;
  const declinedCount = requests.filter((r: any) => r.status === 'declined').length;

  const filtered = requests.filter((r: any) => r.status === inboxTab);

  const handleAction = (id: number, newStatus: 'accepted' | 'declined') => {
    setRequests((prev: any[]) =>
      prev.map((r: any) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
    if (newStatus === 'accepted') setLastAcceptedId(id);
  };

  const lastAccepted =
    lastAcceptedId != null ? requests.find((r: any) => r.id === lastAcceptedId) : null;

  const emptyCopy =
    inboxTab === 'pending'
      ? 'No pending invitations.'
      : inboxTab === 'accepted'
        ? 'No accepted invitations yet.'
        : 'No declined invitations.';

  return (
    <div className="animate-in fade-in flex h-full min-h-0 flex-col space-y-6">
      <div className="flex shrink-0 flex-col gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-[#2D2A96]">
            <Inbox className="text-[#FF7C6B]" size={24} aria-hidden /> Pending assessments
          </h2>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Manage invitations to provide feedback for your peers.
          </p>
        </div>

        <div className="flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1.5 shadow-inner sm:w-max">
          <button
            type="button"
            onClick={() => setInboxTab('pending')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all ${
              inboxTab === 'pending' ? 'bg-white text-[#2D2A96] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending{' '}
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{pendingCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setInboxTab('accepted')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all ${
              inboxTab === 'accepted' ? 'bg-white text-[#2D2A96] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle2 size={16} className={inboxTab === 'accepted' ? 'text-emerald-500' : ''} aria-hidden />
            Accepted{' '}
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{acceptedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setInboxTab('declined')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all ${
              inboxTab === 'declined' ? 'bg-white text-[#2D2A96] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <X size={16} className={inboxTab === 'declined' ? 'text-rose-500' : ''} aria-hidden />
            Declined{' '}
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{declinedCount}</span>
          </button>
        </div>
      </div>

      {lastAccepted && lastAccepted.status === 'accepted' && (
        <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold leading-snug text-emerald-950">
            <span className="mr-1 inline-flex align-middle text-emerald-600">
              <CheckCircle2 size={15} className="inline shrink-0" strokeWidth={2.5} aria-hidden />
            </span>
            You accepted <strong className="font-black">{lastAccepted.name}</strong>. Want to respond now?
          </p>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onOpenChat(lastAccepted.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FF7C6B] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#ff6a57]"
            >
              <MessageCircle size={14} aria-hidden /> Start feedback
            </button>
            <button
              type="button"
              onClick={() => setLastAcceptedId(null)}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/60"
            >
              Later
            </button>
          </div>
        </div>
      )}

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto pr-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center font-bold text-gray-400">
            {emptyCopy}
          </div>
        )}

        {filtered.map((req: any) => (
          <div
            key={req.id}
            className={`flex flex-col justify-between gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:flex-row lg:items-center ${
              req.status === 'accepted'
                ? 'border-[#2D2A96]/15 bg-[#2D2A96]/5'
                : req.status === 'declined'
                  ? 'bg-gray-50'
                  : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm font-black text-[#2D2A96] shadow-sm">
                {req.name.charAt(0)}
              </div>

              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h4 className="text-base font-bold text-gray-900">{req.name}</h4>
                  <span className="text-xs font-medium text-gray-400">
                    @{String(req.name).split(' ')[0].toLowerCase()}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{req.role}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden />

                  {req.source === 'AI Suggested' ? (
                    <span className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                      <Sparkles size={10} aria-hidden /> AI suggested
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                      <Users size={10} aria-hidden /> Direct team
                    </span>
                  )}
                </div>
              </div>
            </div>

            {req.status === 'pending' ? (
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 lg:border-none lg:pt-0 lg:items-end">
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    req.sla === 'Overdue' ? 'text-rose-600' : 'text-amber-600'
                  }`}
                >
                  <Clock size={14} aria-hidden /> {req.sla}
                </div>

                <div className="flex w-full items-center gap-3 lg:w-auto">
                  <button
                    type="button"
                    onClick={() => handleAction(req.id, 'declined')}
                    className="flex-1 rounded-xl border border-gray-200 px-6 py-2.5 text-center text-xs font-bold text-gray-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 lg:flex-none lg:min-w-[7.5rem]"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(req.id, 'accepted')}
                    className="flex-1 rounded-xl border border-[#2D2A96] bg-[#2D2A96] px-6 py-2.5 text-center text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1f1d69] lg:flex-none lg:min-w-[7.5rem]"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ) : req.status === 'accepted' ? (
              <div className="flex w-full flex-col items-stretch gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center lg:w-auto lg:border-none lg:pt-0">
                <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-center text-[10px] font-black uppercase text-emerald-700 sm:w-auto sm:justify-start">
                  <CheckCircle2 size={14} aria-hidden /> Accepted
                </span>
                <button
                  type="button"
                  onClick={() => onOpenChat(req.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7C6B] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#ff6a57] sm:w-auto"
                >
                  <MessageCircle size={16} aria-hidden /> Start feedback
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 border-t border-gray-100 pt-4 lg:border-none lg:pt-0">
                <span className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] font-black uppercase text-gray-500">
                  <X size={14} aria-hidden /> Declined
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. CHAT VIEW
function ChatView({
  acceptedRequests,
  focusPeerId,
  onFocusConsumed,
}: {
  acceptedRequests: any[];
  focusPeerId: number | null;
  onFocusConsumed: () => void;
}) {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  useEffect(() => {
    if (focusPeerId == null) return;
    if (!acceptedRequests.some((r) => r.id === focusPeerId)) return;
    setSelectedChat(focusPeerId);
    onFocusConsumed();
  }, [focusPeerId, acceptedRequests, onFocusConsumed]);

  if (acceptedRequests.length === 0)
    return (
      <div className="p-8 text-center text-gray-500 font-semibold text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center h-full max-w-md mx-auto">
        <MessageCircle size={32} className="mb-3 text-gray-500" strokeWidth={1.5} />
        <p className="text-sm font-black text-[#201E73] tracking-tight mb-1">No chats yet</p>
        <p className="text-xs text-gray-600 font-medium leading-snug max-w-[18rem]">
          Accept a request in your Inbox to start chatting with peers.
        </p>
      </div>
    );

  const activePeer =
    acceptedRequests.find((r) => r.id === selectedChat) ?? acceptedRequests[0];

  return (
    <div className="animate-in fade-in h-full flex flex-col md:flex-row gap-4 min-h-0">
       <div className="w-full md:w-[240px] shrink-0 flex flex-col gap-2 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4">
         <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Open chats</h3>
         {acceptedRequests.map(req => (
           <button
             key={req.id}
             type="button"
             onClick={() => setSelectedChat(req.id)}
             className={`text-left p-2.5 rounded-lg border cursor-pointer transition-colors ${activePeer.id === req.id ? 'border-[#201E73] bg-[#201E73]/5 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}
           >
             <div className="font-semibold text-sm text-gray-800 truncate">{req.name}</div>
             <div className="text-[10px] text-gray-500 font-medium mt-0.5 truncate">{req.role}</div>
           </button>
         ))}
       </div>

       <div className="w-full min-w-0 flex flex-col flex-1 h-[min(520px,70vh)] bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
         <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-200 z-10">
           <div className="w-9 h-9 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
             {activePeer.name.charAt(0)}
           </div>
           <div className="min-w-0">
             <h2 className="text-sm font-black text-[#201E73] leading-tight truncate">{activePeer.name}</h2>
             <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate max-w-[8rem]">{activePeer.role}</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full shrink-0" aria-hidden />
                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 ${activePeer.source === 'AI Suggested' ? 'bg-[#fd6e5e]/10 text-[#fd6e5e] border-[#fd6e5e]/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {activePeer.source}
                </span>
             </div>
           </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar min-h-0">
           <div className="flex gap-2 max-w-[95%]">
             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0"><Brain size={15} /></div>
             <div className="p-3 rounded-xl rounded-tl-sm bg-white border border-gray-200 text-xs text-gray-800 leading-relaxed shadow-sm">
               Hello! Let&apos;s build the feedback for <strong>{activePeer.name}</strong>. Can you describe a specific situation regarding their impact this quarter?
             </div>
           </div>
           <div className="flex gap-2 max-w-[95%] ml-auto flex-row-reverse">
             <div className="w-8 h-8 rounded-full bg-[#201E73] text-white flex items-center justify-center shrink-0 text-[10px] font-bold">You</div>
             <div className="p-3 rounded-xl rounded-tr-sm bg-[#201E73] text-white text-xs leading-relaxed shadow-sm">
               During the {activePeer.context} project, the deliverables were exactly on point.
             </div>
           </div>
         </div>
         
         <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
           <input type="text" placeholder="Type your response (SCI method)..." className="flex-1 min-w-0 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 outline-none text-xs focus:border-[#201E73] focus:ring-1 focus:ring-[#201E73]/20 transition-all" />
           <button type="button" className="px-4 py-2.5 bg-[#fd6e5e] text-white rounded-lg shadow-sm hover:bg-[#e65c4c] font-semibold text-xs flex items-center gap-1.5 shrink-0"><Send size={15} /> Send</button>
         </div>
       </div>
    </div>
  );
}

// 4. INSIGHTS VIEW
function InsightsView({ quarter }: any) {
  return (
    <div className="animate-in fade-in space-y-5 h-full flex flex-col min-h-0">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-[#201E73]/5 text-[#201E73] border border-[#201E73]/10 rounded-xl shrink-0"><Sparkles size={22} strokeWidth={2} /></div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-[#201E73] leading-tight">My AI Insights</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
            Draft based on <strong className="text-gray-700">45 feedback signals</strong> through {quarter}.
          </p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start gap-3 shadow-sm">
        <BarChart3 className="text-emerald-600 shrink-0 mt-0.5" size={20} strokeWidth={2} />
        <div className="min-w-0">
          <h4 className="text-xs font-black text-emerald-900 mb-1">AI confidence: High</h4>
          <p className="text-xs font-medium text-emerald-800 leading-snug">
            Feedback volume supports an accurate impact draft. Trending toward <strong>High Performer</strong>.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col hover:border-blue-200 transition-colors min-h-0">
          <div className="w-9 h-9 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center mb-3 border border-blue-200"><Target size={18} /></div>
          <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-2">Results</h4>
          <p className="text-xs text-gray-700 leading-snug font-medium">High-quality outputs. API refactoring cited by 3 peers; strong milestone on tech debt (−40%).</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col hover:border-[#fd6e5e]/40 transition-colors min-h-0">
          <div className="w-9 h-9 bg-[#fd6e5e]/10 text-[#fd6e5e] rounded-lg flex items-center justify-center mb-3 border border-[#fd6e5e]/25"><Code size={18} /></div>
          <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-2">Tech</h4>
          <p className="text-xs text-gray-700 leading-snug font-medium">Solid architecture; proactive on Design System components across 3 squads.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col hover:border-amber-200 transition-colors min-h-0">
          <div className="w-9 h-9 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center mb-3 border border-amber-200"><ThumbsUp size={18} /></div>
          <h4 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-2">Culture</h4>
          <p className="text-xs text-gray-700 leading-snug font-medium">Strong collaborator and mentor; helps unblock juniors with a positive tone.</p>
        </div>
      </div>
    </div>
  );
}

type DirectReport = (typeof MANAGER_DIRECT_REPORTS)[0];

function ManagerTeamHub({
  isReviewPhase,
  onOpenFeedbackChat,
  onOpenReviewChat,
}: {
  isReviewPhase: boolean;
  onOpenFeedbackChat: (m: DirectReport) => void;
  onOpenReviewChat: (m: DirectReport) => void;
}) {
  return (
    <div className="animate-in fade-in h-full flex flex-col gap-4 min-h-0">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-lg font-black text-[#201E73] flex items-center gap-2">
          <Users className="text-[#201E73] shrink-0" size={20} strokeWidth={2} />
          Leadership hub
        </h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
          Every direct report in one place: year context, chat feedback, and AI-assisted formal review when Performance Review is open.
        </p>
      </div>

      {isReviewPhase && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 flex gap-2 items-start">
          <ClipboardList size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-950 leading-snug">
            <span className="font-bold">Performance Review is on:</span> the insights below blend year-to-date continuous feedback. Use the review chat for AI to help draft with you.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
        {MANAGER_DIRECT_REPORTS.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:border-[#201E73]/25 transition-colors"
          >
            <div className="p-3.5 flex flex-col sm:flex-row sm:items-start gap-3 border-b border-gray-100 bg-gray-50/40">
              <div className="w-10 h-10 rounded-full bg-[#201E73]/10 text-[#201E73] flex items-center justify-center font-bold text-sm border border-[#201E73]/15 shrink-0">
                {m.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="font-bold text-gray-900 text-sm">{m.name}</h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[#201E73]">
                    9-box · {m.box}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-0.5">{m.role}</p>
                <p className="text-[10px] text-gray-500 mt-2">
                  <span className="font-semibold text-gray-700">{m.signals}</span> feedback touchpoints YTD · last touch {m.lastTouch}
                </p>
              </div>
            </div>

            <div className="p-3.5 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <ListChecks size={12} /> Recurring themes in feedback
                </p>
                <div className="flex flex-wrap gap-1">
                  {m.themes.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => onOpenFeedbackChat(m)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 font-bold text-xs hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageCircle size={15} className="text-[#fd6e5e]" strokeWidth={2} />
                  Chat feedback
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReviewChat(m)}
                  disabled={!isReviewPhase}
                  title={!isReviewPhase ? 'Available during Performance Review (simulate Q4 above)' : undefined}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm ${
                    isReviewPhase
                      ? 'bg-[#201E73] text-white hover:bg-[#161453]'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FileSignature size={15} />
                  AI-assisted review
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadershipChatModal({
  open,
  ctx,
  onClose,
  onComplete,
}: {
  open: boolean;
  ctx: { member: DirectReport; mode: 'feedback' | 'review' } | null;
  onClose: () => void;
  onComplete: (kind: 'feedback' | 'review') => void;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);

  useEffect(() => {
    if (!open || !ctx) return;
    setInput('');
    if (ctx.mode === 'review') {
      setMessages([
        {
          role: 'ai',
          text: `Hi! Here’s a year-to-date snapshot for ${ctx.member.name}: ${ctx.member.themes.slice(0, 2).join(', ')} and ${Math.max(0, ctx.member.signals - 5)} other data points. How would you rate their impact in this formal cycle?`,
        },
      ]);
    } else {
      setMessages([
        {
          role: 'ai',
          text: `Let’s capture developmental feedback for ${ctx.member.name}. What’s a recent moment that shows the behavior you want to reinforce?`,
        },
      ]);
    }
  }, [open, ctx]);

  if (!open || !ctx) return null;

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMessages((prev) => [...prev, { role: 'user', text: t }]);
    setInput('');
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text:
            ctx.mode === 'review'
              ? 'Great — I’ve folded that into the draft with the year’s evidence. When you’re ready, finalize below.'
              : 'Thanks — note saved. Want to add another example?',
        },
      ]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-3 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-4 py-3 bg-[#201E73] text-white flex justify-between items-start gap-2">
          <div className="flex gap-2 min-w-0">
            <div className="p-1.5 bg-white/15 rounded-lg shrink-0">
              <Brain size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-snug">
                {ctx.mode === 'review' ? 'AI-assisted review' : 'Continuous feedback'} · {ctx.member.name}
              </h3>
              <p className="text-[10px] text-white/85">{ctx.member.role}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {ctx.mode === 'review' && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide mb-1">Consolidated signals (continuous feedback)</p>
            <ul className="text-[11px] text-amber-950 space-y-0.5 list-disc list-inside leading-snug">
              <li>{ctx.member.signals} touchpoints logged this year</li>
              <li>Recurring themes: {ctx.member.themes.join(' · ')}</li>
              <li>Tip: anchor your review narrative with specific examples.</li>
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50 min-h-[200px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#fd6e5e] text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 bg-white space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={
                ctx.mode === 'review'
                  ? 'Impact, examples, growth areas…'
                  : 'Situations, behaviors, next steps…'
              }
              className="flex-1 min-w-0 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#201E73]/25"
            />
            <button
              type="button"
              onClick={send}
              className="px-3 py-2.5 bg-[#fd6e5e] text-white rounded-xl shadow-sm hover:bg-[#e65c4c] transition-all shrink-0"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          {ctx.mode === 'review' ? (
            <button
              type="button"
              onClick={() => onComplete('review')}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 flex items-center justify-center gap-2 transition-colors"
            >
              <Check size={14} strokeWidth={2.5} /> Finalize review draft
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete('feedback')}
              className="w-full py-2.5 rounded-xl bg-[#201E73] text-white text-xs font-bold hover:bg-[#161453] flex items-center justify-center gap-2"
            >
              <Check size={14} strokeWidth={2.5} /> Save feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const TRACK_SENT_MOCK = [
  {
    id: 'tr1',
    peerName: 'Ana Costa',
    role: 'Product Manager',
    topic: 'Cross-squad delivery',
    sentOn: 'May 4, 2026',
    dueIn: '5 days',
    status: 'awaiting' as const,
  },
  {
    id: 'tr2',
    peerName: 'Rui Mendes',
    role: 'Engineering Manager',
    topic: 'Leadership & scope',
    sentOn: 'Apr 30, 2026',
    dueIn: '2 days',
    status: 'opened' as const,
  },
  {
    id: 'tr3',
    peerName: 'Laura Kim',
    role: 'Senior Designer',
    topic: 'Critique & craft',
    sentOn: 'Apr 18, 2026',
    dueIn: '—',
    status: 'responded' as const,
  },
  {
    id: 'tr4',
    peerName: 'Tom Weber',
    role: 'Data Analyst',
    topic: 'Metrics narrative',
    sentOn: 'Apr 12, 2026',
    dueIn: 'Overdue',
    status: 'awaiting' as const,
  },
];

function TrackView() {
  const awaiting = TRACK_SENT_MOCK.filter((r) => r.status === 'awaiting').length;
  const opened = TRACK_SENT_MOCK.filter((r) => r.status === 'opened').length;
  const responded = TRACK_SENT_MOCK.filter((r) => r.status === 'responded').length;

  const statusBadge = (s: (typeof TRACK_SENT_MOCK)[0]['status']) => {
    if (s === 'responded')
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-emerald-100">
          <CheckCircle2 size={12} className="shrink-0" /> Responded
        </span>
      );
    if (s === 'opened')
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-blue-100">
          <Eye size={12} className="shrink-0" /> Opened
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-amber-100">
        <Hourglass size={12} className="shrink-0" /> Awaiting
      </span>
    );
  };

  return (
    <div className="animate-in fade-in h-full flex flex-col gap-4 min-h-0">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-lg font-black text-[#201E73] flex items-center gap-2">
          <Clock className="text-[#201E73] shrink-0" size={20} strokeWidth={2} />
          Track sent requests
        </h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
          Follow feedback invitations you sent and their response status.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Sent (Q2)</p>
          <p className="text-xl font-black text-[#201E73] leading-tight mt-0.5">{TRACK_SENT_MOCK.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/90">Awaiting</p>
          <p className="text-xl font-black text-amber-900 leading-tight mt-0.5">{awaiting}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800/90">Responded</p>
          <p className="text-xl font-black text-emerald-900 leading-tight mt-0.5">{responded}</p>
        </div>
      </div>

      <p className="text-[10px] text-gray-500">
        <span className="font-semibold text-gray-600">{opened}</span> invite(s) opened — reminder sent if no reply after 7 days.
      </p>

      <div className="flex-1 overflow-x-auto min-h-0 rounded-xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-left text-xs min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/90 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-semibold">Peer</th>
              <th className="px-3 py-2 font-semibold hidden sm:table-cell">Topic</th>
              <th className="px-3 py-2 font-semibold">Sent</th>
              <th className="px-3 py-2 font-semibold">SLA</th>
              <th className="px-3 py-2 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {TRACK_SENT_MOCK.map((row) => (
              <tr key={row.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                <td className="px-3 py-2.5 align-top">
                  <div className="font-semibold text-gray-900 leading-tight">{row.peerName}</div>
                  <div className="text-[10px] text-gray-500 font-medium mt-0.5">{row.role}</div>
                  <div className="text-[10px] text-gray-500 mt-1 sm:hidden truncate max-w-[12rem]">{row.topic}</div>
                </td>
                <td className="px-3 py-2.5 align-top text-gray-600 hidden sm:table-cell max-w-[10rem] truncate">{row.topic}</td>
                <td className="px-3 py-2.5 align-top text-gray-600 whitespace-nowrap">{row.sentOn}</td>
                <td className="px-3 py-2.5 align-top whitespace-nowrap">
                  <span
                    className={
                      row.dueIn === 'Overdue'
                        ? 'text-rose-600 font-bold'
                        : row.dueIn === '—'
                          ? 'text-gray-500'
                          : 'text-gray-700'
                    }
                  >
                    {row.dueIn}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-middle text-right">{statusBadge(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManagerReviewView({
  onOpenTeam,
  isReviewPhase,
}: {
  onOpenTeam: () => void;
  isReviewPhase: boolean;
}) {
  return (
    <div className="animate-in fade-in space-y-4 min-h-0">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-lg font-black text-[#201E73] flex items-center gap-2">
          <ShieldCheck className="text-[#201E73] shrink-0" size={20} strokeWidth={2} />
          Leadership assessment (180°)
        </h2>
        <p className="text-xs text-gray-500 font-medium mt-1 leading-snug">
          {isReviewPhase
            ? 'Open the Leadership hub for each direct report: you’ll see year themes and run the formal review in chat with AI support.'
            : 'During Performance Review, the chat weaves in continuous feedback and draft language — for now, pick Q4 in the selector above to walk through the full flow.'}
        </p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
        <div className="p-2 bg-white rounded-lg border border-blue-200 text-[#201E73] shrink-0 shadow-sm">
          <Users size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#201E73]">Go to Leadership hub</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
            Full team list with chat feedback and AI-assisted review per person.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTeam}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#201E73] text-white text-xs font-bold hover:bg-[#161453] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Users size={16} strokeWidth={2} /> Open hub
        </button>
      </div>
    </div>
  );
}
function SelfEvaluationView() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 min-h-[280px]">
      <div className="w-14 h-14 rounded-full bg-[#201E73]/10 text-[#201E73] flex items-center justify-center mb-4 border border-[#201E73]/15">
        <ClipboardList size={28} strokeWidth={2} />
      </div>
      <h3 className="text-lg font-black text-[#201E73] tracking-tight mb-2">Self evaluation</h3>
      <p className="text-sm text-gray-600 font-medium max-w-md leading-relaxed">
        Your guided self-assessment form will appear here during Performance Review. Simulated in this prototype.
      </p>
    </div>
  );
}