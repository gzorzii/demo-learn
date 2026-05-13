import { useEffect, useState, type ComponentType } from 'react';
import {
  Users,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Target,
  ArrowRightLeft,
  MessageCircle,
  FileSignature,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  Briefcase,
  AlertCircle,
  Brain,
  Check,
  X,
  Send,
  CircleHelp,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import { Switch } from '../components/ui/switch';

type TeamMember = {
  id: number;
  name: string;
  login: string;
  outcome: string;
  pos: string;
  role: string;
  alert?: string;
  /** Enables formal review flow during the Performance Review window */
  evaluationEnabled: boolean;
  feedbackSignalsYtd: number;
  lastOneOnOneDaysAgo: number;
};

const INITIAL_TEAM: TeamMember[] = [
  {
    id: 1,
    name: 'Ana Maria Lopes',
    login: '@analopes',
    outcome: 'Exceeds',
    pos: 'Star',
    role: 'Product Manager',
    alert: 'Promotion Case Prep',
    evaluationEnabled: true,
    feedbackSignalsYtd: 18,
    lastOneOnOneDaysAgo: 9,
  },
  {
    id: 2,
    name: 'Carlos Beta',
    login: '@carlosb',
    outcome: 'Meets',
    pos: 'Core',
    role: 'Tech Lead',
    alert: '1:1 Overdue',
    evaluationEnabled: true,
    feedbackSignalsYtd: 12,
    lastOneOnOneDaysAgo: 22,
  },
  {
    id: 3,
    name: 'Diana Silva',
    login: '@dianas',
    outcome: 'Meets',
    pos: 'Core',
    role: 'QA Engineer',
    evaluationEnabled: false,
    feedbackSignalsYtd: 9,
    lastOneOnOneDaysAgo: 14,
  },
  {
    id: 4,
    name: 'Pedro Rocha',
    login: '@pedror',
    outcome: 'Exceeds',
    pos: 'High Perf',
    role: 'Backend Dev',
    evaluationEnabled: true,
    feedbackSignalsYtd: 15,
    lastOneOnOneDaysAgo: 7,
  },
  {
    id: 5,
    name: 'Lucas Mendes',
    login: '@lucasm',
    outcome: 'Developing',
    pos: 'Dilemma',
    role: 'Mobile Dev',
    alert: 'Performance Plan',
    evaluationEnabled: false,
    feedbackSignalsYtd: 6,
    lastOneOnOneDaysAgo: 31,
  },
];

/** Quadrant tags by talent semantics */
const QUADRANT_TAG_STYLES: Record<string, string> = {
  Star: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'High Po': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Core: 'bg-blue-50 text-blue-800 border-blue-200',
  'High Perf': 'bg-cyan-50 text-cyan-900 border-cyan-200',
  Dilemma: 'bg-amber-50 text-amber-900 border-amber-200',
  Underperformer: 'bg-rose-50 text-rose-800 border-rose-200',
  Solid: 'bg-slate-50 text-slate-800 border-slate-200',
  Expert: 'bg-violet-50 text-violet-800 border-violet-200',
  Enigma: 'bg-gray-50 text-gray-800 border-gray-300',
};

function getQuadrantTagClasses(pos: string): string {
  return QUADRANT_TAG_STYLES[pos] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

function QuadrantTag({ pos, struck }: { pos: string; struck?: boolean }) {
  return (
    <span
      className={`inline-flex items-center text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${getQuadrantTagClasses(pos)} ${
        struck ? 'line-through decoration-2 decoration-gray-700 opacity-80' : ''
      }`}
      title={struck ? `Current quadrant (${pos}) — will change` : pos}
    >
      {pos}
    </span>
  );
}

export function TeamManagement() {
  const [teamData, setTeamData] = useState<TeamMember[]>(INITIAL_TEAM);
  const [reviewSeasonActive] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatType, setChatType] = useState<'feedback' | 'evaluation'>('feedback');
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEvalSuccess, setShowEvalSuccess] = useState(false);

  const getPeersInBox = (boxName: string) => teamData.filter((p) => p.pos === boxName);

  const openChat = (type: 'feedback' | 'evaluation', member: TeamMember) => {
    if (type === 'evaluation' && reviewSeasonActive && !member.evaluationEnabled) return;
    setChatType(type);
    setActiveMember(member);
    setChatOpen(true);
    setChatInput('');
    setChatMessages([]);
  };

  useEffect(() => {
    if (!chatOpen || !activeMember) return;
    const seed =
      chatType === 'evaluation'
        ? [
            {
              role: 'ai' as const,
              text: `Hi! I pulled themes from ${activeMember.feedbackSignalsYtd} continuous feedback touchpoints this year — collaboration, delivery cadence, and clarity in rituals stood out. In your own words, what impact did ${activeMember.name.split(' ')[0]} have this cycle? I’ll help shape your review narrative.`,
            },
          ]
        : [
            {
              role: 'ai' as const,
              text: `Let’s capture developmental feedback for ${activeMember.name}. What’s one recent situation that shows how they’re growing — and one stretch area to build on?`,
            },
          ];
    setChatMessages(seed);
  }, [chatOpen, activeMember, chatType]);

  const sendChat = () => {
    const t = chatInput.trim();
    if (!t || !activeMember) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: t }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text:
            chatType === 'evaluation'
              ? 'Got it — I blended that with the longitudinal signals. You can refine wording below, then finalize when ready.'
              : 'Thanks — that gives great context. Want to add another example or wrap up?',
        },
      ]);
    }, 450);
  };

  const finalizeEvaluationDraft = () => {
    setShowEvalSuccess(true);
    setChatOpen(false);
  };

  const toggleEvaluationEnabled = (id: number, checked: boolean) => {
    setTeamData((prev) => prev.map((p) => (p.id === id ? { ...p, evaluationEnabled: checked } : p)));
  };

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveStep, setMoveStep] = useState(1);
  const [movingIds, setMovingIds] = useState<number[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number[]>([]);
  const [selectedRight, setSelectedRight] = useState<number[]>([]);
  const [moveDrafts, setMoveDrafts] = useState<Record<number, { pos: string; justification: string }>>({});
  const quadrantOptions = [
    'Enigma',
    'High Po',
    'Star',
    'Dilemma',
    'Core',
    'High Perf',
    'Underperformer',
    'Solid',
    'Expert',
  ];

  const toggleSelect = (id: number, side: 'left' | 'right') => {
    if (side === 'left')
      setSelectedLeft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    else setSelectedRight((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSaveMassMove = () => {
    const updatedTeam = teamData.map((p) => {
      if (movingIds.includes(p.id) && moveDrafts[p.id]?.pos) return { ...p, pos: moveDrafts[p.id].pos };
      return p;
    });
    setTeamData(updatedTeam);
    setIsMoveModalOpen(false);
    setMoveStep(1);
    setMovingIds([]);
    setMoveDrafts({});
    setSelectedLeft([]);
    setSelectedRight([]);
  };

  const enabledEvalCount = teamData.filter((p) => p.evaluationEnabled).length;

  /** List cards: header always visible; details when expanded */
  const [expandedMemberIds, setExpandedMemberIds] = useState<Record<number, boolean>>({});

  const toggleMemberCard = (id: number) => {
    setExpandedMemberIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12 px-4 sm:px-6 space-y-6 font-['DM_Sans'] text-sm text-gray-700 animate-in fade-in duration-500 bg-[#F8F9FA] min-h-[calc(100vh-6rem)] rounded-2xl">
      {/* Hero — fundo azul marca (sem ícone lateral, sem faixa inferior) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#161453] bg-[#201E73] shadow-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/[0.1]" aria-hidden />
        <div className="relative px-5 py-7 sm:px-8 sm:py-9 flex flex-col lg:flex-row lg:items-start gap-6 lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/65 mb-1.5">Talent &amp; performance</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Team Talent Hub
            </h1>
            <p className="text-sm text-white/85 font-medium mt-3 max-w-2xl leading-relaxed">
              One place for your team: calibrate talent, capture continuous feedback, and prepare Performance Review with AI support —
              clear language and decisions front and center.
            </p>
          </div>
          {reviewSeasonActive && (
            <div className="shrink-0 flex flex-col sm:items-end gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-white bg-white/15 border border-white/25 px-3.5 py-2 rounded-xl backdrop-blur-sm shadow-sm">
                <MapPin size={16} strokeWidth={2} className="text-[#fd6e5e] shrink-0" aria-hidden />
                Available
              </span>
              <p className="text-[10px] text-white/70 font-medium max-w-[14rem] text-left sm:text-right leading-snug hidden sm:block">
                Review cycle is active for formal workflows and assisted chats.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-[#201E73]/15">
          <div className="p-3 rounded-xl bg-[#201E73]/10 text-[#201E73] ring-1 ring-[#201E73]/10">
            <Users size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Direct reports</p>
            <p className="text-2xl font-black text-[#201E73] tabular-nums mt-0.5">{teamData.length}</p>
          </div>
        </div>
        <div className="group rounded-2xl border-2 border-emerald-700/15 bg-white p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md ring-1 ring-emerald-800/5">
          <div className="p-3 rounded-xl bg-emerald-700 text-white shadow-sm">
            <Check size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">Formal review enabled</p>
            <p className="text-2xl font-black text-emerald-900 tabular-nums mt-0.5">{enabledEvalCount}</p>
          </div>
        </div>
        <div className="group rounded-2xl border border-[#fd6e5e]/25 bg-gradient-to-br from-white to-[#fd6e5e]/[0.06] p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-[#fd6e5e]/35">
          <div className="p-3 rounded-xl bg-[#fd6e5e]/15 text-[#c94a3f] border border-[#fd6e5e]/25">
            <CalendarDays size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">Feedback evidence (avg.)</p>
            <p className="text-2xl font-black text-[#201E73] tabular-nums mt-0.5">
              {Math.round(teamData.reduce((a, p) => a + p.feedbackSignalsYtd, 0) / teamData.length)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Lista do time */}
        <div className="xl:col-span-5 space-y-3">
          <div className="rounded-xl px-4 py-3 border border-slate-200/90 bg-gradient-to-r from-slate-100 to-[#eef1fb] text-slate-800 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-white/80 border border-slate-200/80 rounded-lg shrink-0 text-[#201E73] shadow-sm">
                <Users size={16} strokeWidth={2} />
              </div>
              <h3 className="font-bold text-sm truncate text-[#201E73]">Team members</h3>
            </div>
            <span className="bg-white/90 text-[#201E73] text-[9px] font-black px-2 py-0.5 rounded-md border border-slate-200/80 uppercase shrink-0 shadow-sm">
              {teamData.length} profiles
            </span>
          </div>

          {teamData.map((p) => {
            const isOpen = !!expandedMemberIds[p.id];
            return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => toggleMemberCard(p.id)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#201E73]/12 to-[#fd6e5e]/10 flex items-center justify-center font-black text-[#201E73] text-sm border-2 border-white shadow-sm ring-1 ring-gray-200">
                    {p.name.charAt(0)}
                  </div>
                  {p.alert ? (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white shadow-sm"
                      title="Open item"
                      aria-label="Open item"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight">{p.name}</h4>
                    <span className="text-[10px] text-gray-500 font-semibold">{p.login}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-0.5">{p.role}</p>
                  {!isOpen && (
                    <p className="text-[10px] text-gray-500 font-medium mt-1.5">
                      Current quadrant: <span className="font-bold text-[#201E73]">{p.pos}</span>
                      {p.alert ? (
                        <span className="text-rose-700"> · Needs attention</span>
                      ) : null}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2 text-[#201E73]">
                  <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:inline text-gray-500">
                    {isOpen ? 'Collapse' : 'View details'}
                  </span>
                  {isOpen ? <ChevronUp size={18} strokeWidth={2} /> : <ChevronDown size={18} strokeWidth={2} />}
                </div>
              </button>

              {isOpen && (
              <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
              <div className="pt-3 flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                      {p.outcome}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200">
                      9-box: {p.pos}
                    </span>
                    {p.alert && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        {p.alert}
                      </span>
                    )}
                  </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white rounded-lg border border-gray-200 px-2.5 py-2">
                    <p className="text-gray-500 font-bold uppercase mb-0.5">Last 1:1</p>
                    <p className={`font-bold ${p.lastOneOnOneDaysAgo > 18 ? 'text-rose-600' : 'text-[#201E73]'}`}>
                      {p.lastOneOnOneDaysAgo} days ago
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 px-2.5 py-2">
                    <p className="text-gray-500 font-bold uppercase mb-0.5">Evidence YTD</p>
                    <p className="font-bold text-[#201E73]">{p.feedbackSignalsYtd} touchpoints</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-gray-600 leading-tight">
                      Enable formal review
                      <span className="block font-normal text-gray-500 font-medium">for Performance Review</span>
                    </span>
                  </div>
                  <Switch
                    checked={p.evaluationEnabled}
                    onCheckedChange={(c) => toggleEvaluationEnabled(p.id, c)}
                    className="data-[state=checked]:bg-[#201E73]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openChat('feedback', p);
                    }}
                    className="w-full py-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 font-bold text-xs hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <MessageCircle size={15} className="text-[#fd6e5e]" strokeWidth={2} />
                    Chat feedback
                  </button>
                  <button
                    type="button"
                    disabled={!reviewSeasonActive || !p.evaluationEnabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      openChat('evaluation', p);
                    }}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      reviewSeasonActive && p.evaluationEnabled
                        ? 'bg-[#201E73] text-white hover:bg-[#161453]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={
                      !reviewSeasonActive
                        ? 'Outside the review window'
                        : !p.evaluationEnabled
                          ? 'Turn on “Enable formal review” above'
                          : undefined
                    }
                  >
                    <FileSignature size={15} />
                    AI-assisted review
                  </button>
                </div>
              </div>
              </div>
              )}
            </div>
          );})}
        </div>

        {/* 9-box */}
        <div className="xl:col-span-7 min-w-0">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 overflow-visible">
            <div className="mb-5 space-y-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#201E73]/10 text-[#201E73] shrink-0 border border-[#201E73]/10">
                  <LayoutGrid size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-[#201E73] tracking-tight">Matrix view (9-box)</h2>
                  <p className="text-sm text-gray-600 font-medium mt-2 leading-relaxed w-full">
                    See where everyone sits today. High-contrast initials help you spot people quickly in calibration sessions and talent conversations.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl bg-[#fd6e5e] text-white font-bold text-xs sm:text-sm shadow-sm hover:bg-[#e65c4c] hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <ArrowRightLeft size={16} strokeWidth={2} />
                  <span className="text-center sm:text-left leading-tight">
                    Bulk quadrant
                    <span className="hidden sm:inline"> updates</span>
                  </span>
                </button>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 pt-2">
                Quick read · larger dots are easier to scan in session
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <NineBoxCell
                title="Enigma"
                peers={getPeersInBox('Enigma')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={CircleHelp}
              />
              <NineBoxCell
                title="High Potential"
                peers={getPeersInBox('High Po')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={TrendingUp}
              />
              <NineBoxCell
                title="Star"
                peers={getPeersInBox('Star')}
                bgColor="bg-emerald-50"
                borderColor="border-emerald-200"
                titleColor="text-emerald-800"
                tone="emerald"
                icon={Sparkles}
                highlight
              />

              <NineBoxCell
                title="Dilemma"
                peers={getPeersInBox('Dilemma')}
                bgColor="bg-amber-50"
                borderColor="border-amber-200"
                titleColor="text-amber-800"
                tone="amber"
                icon={AlertCircle}
              />
              <NineBoxCell
                title="Core Player"
                peers={getPeersInBox('Core')}
                bgColor="bg-blue-50"
                borderColor="border-blue-200"
                titleColor="text-blue-800"
                tone="blue"
                icon={Target}
              />
              <NineBoxCell
                title="High Performer"
                peers={getPeersInBox('High Perf')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={Award}
              />

              <NineBoxCell
                title="Underperformer"
                peers={getPeersInBox('Underperformer')}
                bgColor="bg-rose-50"
                borderColor="border-rose-200"
                titleColor="text-rose-800"
                tone="rose"
                icon={AlertTriangle}
                highlight
              />
              <NineBoxCell
                title="Solid"
                peers={getPeersInBox('Solid')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
              />
              <NineBoxCell
                title="Expert"
                peers={getPeersInBox('Expert')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={Briefcase}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat modal */}
      {chatOpen && activeMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div
            className="bg-white rounded-2xl w-full max-w-lg sm:max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
          >
            <div className="px-4 py-3.5 bg-[#201E73] text-white flex justify-between items-start gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                  <Brain size={17} />
                </div>
                <div className="min-w-0">
                  <h3 id="chat-title" className="font-bold text-sm leading-snug">
                    {chatType === 'feedback' ? 'Continuous feedback' : 'AI-assisted review'} · {activeMember.name}
                  </h3>
                  <p className="text-[10px] text-white/80 mt-0.5">{activeMember.role}</p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-white/10 shrink-0"
                onClick={() => setChatOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {chatType === 'evaluation' && (
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide mb-1">Year-to-date signals (continuous feedback)</p>
                <ul className="text-[11px] text-amber-950 space-y-1 list-disc list-inside leading-snug">
                  <li>Collaboration mentioned in {Math.max(3, Math.floor(activeMember.feedbackSignalsYtd / 4))} narratives</li>
                  <li>Steady delivery pace last quarter</li>
                  <li>Opportunity: stronger visibility in prioritization rituals</li>
                </ul>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-[220px]">
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-[#fd6e5e] text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 bg-white flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder={chatType === 'evaluation' ? 'Describe impact, examples, next steps…' : 'Describe situations and behaviors…'}
                  className="flex-1 min-w-0 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#201E73]/25"
                />
                <button
                  type="button"
                  onClick={sendChat}
                  className="p-2.5 bg-[#fd6e5e] text-white rounded-xl shadow-md hover:brightness-95 shrink-0"
                  aria-label="Send"
                >
                  <Send size={17} />
                </button>
              </div>
              {chatType === 'evaluation' && (
                <button
                  type="button"
                  onClick={finalizeEvaluationDraft}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <Check size={15} /> Save review draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showEvalSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-xl animate-in zoom-in-95 border border-gray-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <h4 className="text-base font-black text-[#201E73] mb-1">Draft saved</h4>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Your review was saved as a draft. You can pick it up in calibration or submit when the cycle allows.
            </p>
            <button
              type="button"
              onClick={() => setShowEvalSuccess(false)}
              className="w-full py-2.5 rounded-xl bg-[#201E73] text-white text-sm font-bold hover:bg-[#161453]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Mass move modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] border border-gray-100 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="relative px-5 py-5 sm:px-8 sm:py-6 bg-[#201E73] text-white shrink-0">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">9-box · Bulk update</p>
                  <h2 className="text-xl font-black tracking-tight leading-tight">Bulk quadrant updates</h2>
                  <p className="text-xs text-white/85 font-medium mt-2 max-w-xl leading-relaxed">
                    Choose who will move boxes; next you’ll set their destination quadrant and rationale for the record.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/10 shrink-0 transition-colors"
                  aria-label="Close"
                >
                  <X size={22} strokeWidth={2} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border ${
                    moveStep === 1 ? 'bg-white text-[#201E73] border-white' : 'bg-white/10 text-white border-white/30'
                  }`}
                >
                  1 · Select people
                </span>
                <span className="text-white/40 hidden sm:inline">→</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border ${
                    moveStep === 2 ? 'bg-[#fd6e5e] text-white border-[#fd6e5e]' : 'bg-white/10 text-white border-white/30'
                  }`}
                >
                  2 · Destination &amp; rationale
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#F8F9FA] p-4 sm:p-6">
              {moveStep === 1 ? (
                <div className="flex flex-col lg:flex-row gap-4 min-h-[300px] lg:min-h-[320px]">
                  <div className="flex-1 flex flex-col rounded-2xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden min-h-0">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <h4 className="font-black text-xs text-[#201E73] uppercase tracking-wide">Current placement</h4>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">Full roster — click to select</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                      {teamData
                        .filter((p) => !movingIds.includes(p.id))
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => toggleSelect(p.id, 'left')}
                            className={`w-full text-left p-3 rounded-xl border-2 flex items-center justify-between gap-3 transition-all ${
                              selectedLeft.includes(p.id)
                                ? 'border-[#201E73] bg-[#201E73]/5 shadow-sm ring-1 ring-[#201E73]/15'
                                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                            }`}
                          >
                            <span className="font-bold text-sm text-gray-900 truncate">{p.name}</span>
                            <QuadrantTag pos={p.pos} />
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="flex lg:flex-col justify-center items-center gap-3 lg:gap-4 lg:py-8 shrink-0 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMovingIds([...movingIds, ...selectedLeft]);
                        setSelectedLeft([]);
                      }}
                      disabled={selectedLeft.length === 0}
                      className={`flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl font-bold text-xs transition-all min-w-[9rem] ${
                        selectedLeft.length > 0
                          ? 'bg-[#201E73] text-white shadow-md hover:bg-[#161453] hover:-translate-y-0.5'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ChevronRight size={20} strokeWidth={2} />
                      Add to changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMovingIds(movingIds.filter((id) => !selectedRight.includes(id)));
                        setSelectedRight([]);
                      }}
                      disabled={selectedRight.length === 0}
                      className={`flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl font-bold text-xs transition-all min-w-[9rem] border-2 ${
                        selectedRight.length > 0
                          ? 'border-[#fd6e5e] bg-[#fd6e5e]/10 text-[#c94a3f] hover:bg-[#fd6e5e]/15'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft size={20} strokeWidth={2} />
                      Back to list
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col rounded-2xl border-2 border-[#fd6e5e]/35 bg-gradient-to-b from-[#fd6e5e]/[0.08] to-white shadow-md overflow-hidden min-h-0 ring-1 ring-[#fd6e5e]/10">
                    <div className="px-4 py-3 bg-[#fd6e5e]/15 border-b border-[#fd6e5e]/25">
                      <h4 className="font-black text-xs text-[#201E73] uppercase tracking-wide">Planned changes</h4>
                      <p className="text-[10px] text-gray-600 font-medium mt-0.5">
                        Strikethrough tag = current quadrant (overridden in step 2).
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                      {teamData.filter((p) => movingIds.includes(p.id)).length === 0 ? (
                        <p className="text-xs text-gray-500 font-medium text-center py-10 px-4 leading-relaxed">
                          No one selected yet. Pick names on the left and use <strong className="text-gray-700">Add to changes</strong>.
                        </p>
                      ) : (
                        teamData
                          .filter((p) => movingIds.includes(p.id))
                          .map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => toggleSelect(p.id, 'right')}
                              className={`w-full text-left p-3 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                                selectedRight.includes(p.id)
                                  ? 'border-[#fd6e5e] bg-white shadow-md ring-2 ring-[#fd6e5e]/20'
                                  : 'border-white/80 bg-white/90 hover:border-[#fd6e5e]/40'
                              }`}
                            >
                              <span className="font-bold text-sm text-gray-900 truncate">{p.name}</span>
                              <QuadrantTag pos={p.pos} struck />
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                  <p className="text-sm text-gray-600 font-medium px-1">
                    Set each person’s <strong className="text-[#201E73]">new quadrant</strong> and a short rationale.
                  </p>
                  {movingIds.map((id) => {
                    const peer = teamData.find((p) => p.id === id);
                    if (!peer) return null;
                    return (
                      <div
                        key={id}
                        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <span className="font-bold text-[#201E73] text-sm">{peer.name}</span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">from</span>
                          <QuadrantTag pos={peer.pos} struck />
                          <span className="text-[10px] text-gray-400 hidden sm:inline">→</span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">to</span>
                          <span className="text-xs font-bold text-[#fd6e5e]">new quadrant below</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">New quadrant</label>
                          <select
                            className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-[#201E73] focus:ring-2 focus:ring-[#201E73]/15"
                            value={moveDrafts[id]?.pos || ''}
                            onChange={(e) =>
                              setMoveDrafts((prev) => ({
                                ...prev,
                                [id]: { ...prev[id], pos: e.target.value },
                              }))
                            }
                          >
                            <option value="" disabled>
                              Choose destination quadrant…
                            </option>
                            {quadrantOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Rationale</label>
                          <textarea
                            placeholder="e.g. post-calibration alignment, scope change, consolidated feedback…"
                            className="w-full min-h-[88px] bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 resize-y outline-none focus:border-[#201E73] focus:ring-2 focus:ring-[#201E73]/15"
                            value={moveDrafts[id]?.justification || ''}
                            onChange={(e) =>
                              setMoveDrafts((prev) => ({
                                ...prev,
                                [id]: { ...prev[id], justification: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 py-4 sm:px-8 bg-white border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
              {moveStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setMoveStep(1)}
                  className="text-sm font-bold text-gray-600 hover:text-[#201E73] px-2 py-2 transition-colors"
                >
                  ← Back
                </button>
              ) : (
                <span className="text-xs text-gray-500 font-medium max-w-[18rem] leading-snug">
                  {movingIds.length > 0
                    ? `${movingIds.length} ${movingIds.length !== 1 ? 'people' : 'person'} queued for update`
                    : 'Select people on the left and send them to the changes column.'}
                </span>
              )}
              <div className="flex gap-2 ml-auto">
                {moveStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setMoveStep(2)}
                    disabled={movingIds.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#201E73] text-white font-bold text-sm shadow-sm hover:bg-[#161453] disabled:opacity-40 disabled:pointer-events-none transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Next
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveMassMove}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm shadow-sm hover:bg-emerald-800 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Check size={18} strokeWidth={2} /> Apply changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PEER_AVATAR_BY_TONE: Record<string, string> = {
  neutral:
    'bg-white text-[#201E73] border-[3px] border-gray-500 shadow-lg ring-2 ring-white hover:ring-[#201E73]/30',
  emerald:
    'bg-white text-emerald-900 border-[3px] border-emerald-600 shadow-lg ring-2 ring-white ring-offset-1 ring-offset-emerald-50',
  blue: 'bg-white text-blue-900 border-[3px] border-blue-600 shadow-lg ring-2 ring-white ring-offset-1 ring-offset-blue-50',
  rose: 'bg-white text-rose-900 border-[3px] border-rose-600 shadow-lg ring-2 ring-white ring-offset-1 ring-offset-rose-50',
  amber: 'bg-white text-amber-900 border-[3px] border-amber-600 shadow-lg ring-2 ring-white ring-offset-1 ring-offset-amber-50',
};

function NineBoxCell({
  title,
  peers,
  bgColor,
  borderColor,
  titleColor,
  tone,
  icon: Icon,
  highlight,
}: {
  title: string;
  peers: TeamMember[];
  bgColor: string;
  borderColor: string;
  titleColor: string;
  tone: 'neutral' | 'emerald' | 'blue' | 'rose' | 'amber';
  icon?: ComponentType<{ size?: number; className?: string }>;
  highlight?: boolean;
}) {
  const avatarTone = PEER_AVATAR_BY_TONE[tone] ?? PEER_AVATAR_BY_TONE.neutral;

  return (
    <div
      className={`rounded-xl border-2 p-3 sm:p-3.5 flex flex-col min-h-[124px] sm:min-h-[132px] transition-all overflow-visible ${bgColor} ${borderColor} ${
        highlight ? 'shadow-md ring-1 ring-[#201E73]/15' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5 gap-1">
        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight ${titleColor}`}>{title}</span>
        {Icon && <Icon size={14} className={`${titleColor} shrink-0`} strokeWidth={2} />}
      </div>
      <div className="flex flex-wrap gap-2 items-start justify-center flex-1 content-start overflow-visible">
        {peers.length === 0 ? (
          <span className="text-[10px] font-medium text-gray-500 py-2">—</span>
        ) : (
          peers.map((p) => (
            <div
              key={p.id}
              title={p.name}
              className={`group relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] font-black cursor-help transition-transform hover:scale-105 hover:z-[21] ${avatarTone}`}
              aria-label={p.name}
            >
              <span className="pointer-events-none">{p.name.charAt(0)}</span>
              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#201E73] px-2.5 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-lg ring-1 ring-white/20 transition-opacity duration-150 delay-75 group-hover:opacity-100 group-hover:delay-0">
                {p.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
