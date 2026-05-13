import { useMemo, useState, type ComponentType } from 'react';
import {
  Users,
  CalendarDays,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Clock,
  Brain,
  Sparkles,
  Check,
  AlertTriangle,
  LayoutDashboard,
  Wand2,
  MessageSquareQuote,
  TrendingUp,
  Shield,
  Lightbulb,
  ChevronRight,
  Send,
  LayoutGrid,
  Save,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Award,
  Target,
  Briefcase,
  Github,
  MessageSquare,
  FileText,
  Info,
} from 'lucide-react';

/** Column: aggregated inputs for AI / calibration */
const EVIDENCE_COUNT_LABEL = 'Evidence';
const EVIDENCE_COUNT_TOOLTIP =
  'Count of feedback touchpoints and other evidence captured this cycle (e.g. 360°, rituals, code or tool mentions). It reflects how much input the assisted analysis can use — not a performance score or rating.';

type OutcomeLevel = 'below' | 'developing' | 'meets' | 'exceeds';

const OUTCOME_SCALE: { key: OutcomeLevel; label: string; hint: string }[] = [
  { key: 'below', label: 'Below', hint: 'Below expectations' },
  { key: 'developing', label: 'Developing', hint: 'On a growth path' },
  { key: 'meets', label: 'Meets', hint: 'Meets expectations' },
  { key: 'exceeds', label: 'Exceeds', hint: 'Exceeds expectations' },
];

type CalibrationMember = {
  id: number;
  name: string;
  role: string;
  signals: number;
  pos: string;
  suggested: string;
  suggestedOutcome: OutcomeLevel;
  lastCycleBox: string;
  /** Illustrative 9-box coordinates (impact × behavior, scale 1–3) */
  matrixCoords: { impact: 1 | 2 | 3; behavior: 1 | 2 | 3 };
  boxNumber: number;
  status: 'Ready' | 'Action Required';
  alert: boolean;
};

function sortTeamByCalibrationPriority(team: CalibrationMember[]): CalibrationMember[] {
  return [...team].sort((a, b) => {
    const rank = (x: CalibrationMember) => (x.status === 'Action Required' ? 0 : 1);
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, 'en');
  });
}

const TEAM: CalibrationMember[] = [
  {
    id: 1,
    name: 'Ana Maria Lopes',
    role: 'Product Manager',
    signals: 47,
    pos: 'Star',
    suggested: 'Exceeds Expectations',
    suggestedOutcome: 'exceeds',
    lastCycleBox: 'Box 8 · Star',
    matrixCoords: { impact: 3, behavior: 3 },
    boxNumber: 8,
    status: 'Ready',
    alert: false,
  },
  {
    id: 2,
    name: 'Carlos Beta',
    role: 'Tech Lead',
    signals: 32,
    pos: 'Core',
    suggested: 'High Performer',
    suggestedOutcome: 'exceeds',
    lastCycleBox: 'Box 5 · Core',
    matrixCoords: { impact: 2, behavior: 3 },
    boxNumber: 5,
    status: 'Action Required',
    alert: true,
  },
  {
    id: 3,
    name: 'Diana Silva',
    role: 'QA Engineer',
    signals: 28,
    pos: 'Core',
    suggested: 'Meets Expectations',
    suggestedOutcome: 'meets',
    lastCycleBox: 'Box 5 · Core',
    matrixCoords: { impact: 2, behavior: 2 },
    boxNumber: 5,
    status: 'Ready',
    alert: false,
  },
  {
    id: 4,
    name: 'Pedro Rocha',
    role: 'Backend Developer',
    signals: 41,
    pos: 'High Perf',
    suggested: 'High Performer',
    suggestedOutcome: 'exceeds',
    lastCycleBox: 'Box 6 · High Perf',
    matrixCoords: { impact: 3, behavior: 2 },
    boxNumber: 6,
    status: 'Ready',
    alert: false,
  },
  {
    id: 5,
    name: 'Lucas Mendes',
    role: 'Mobile Developer',
    signals: 19,
    pos: 'Dilemma',
    suggested: 'Meets Expectations',
    suggestedOutcome: 'developing',
    lastCycleBox: 'Box 4 · Dilemma',
    matrixCoords: { impact: 2, behavior: 1 },
    boxNumber: 4,
    status: 'Action Required',
    alert: true,
  },
  {
    id: 6,
    name: 'Beatriz Nogueira',
    role: 'Ops Manager',
    signals: 35,
    pos: 'Core',
    suggested: 'High Performer',
    suggestedOutcome: 'exceeds',
    lastCycleBox: 'Box 5 · Core',
    matrixCoords: { impact: 2, behavior: 3 },
    boxNumber: 5,
    status: 'Ready',
    alert: false,
  },
  {
    id: 7,
    name: 'Rafael Costa',
    role: 'Data Analyst',
    signals: 24,
    pos: 'Solid',
    suggested: 'Meets Expectations',
    suggestedOutcome: 'meets',
    lastCycleBox: 'Box 7 · Solid',
    matrixCoords: { impact: 2, behavior: 2 },
    boxNumber: 7,
    status: 'Ready',
    alert: false,
  },
];

type EvidenceItem = {
  id: string;
  title: string;
  sentiment: 'strong' | 'medium';
  source: 'github' | 'slack' | 'other';
  ref?: string;
  date: string;
};

/** Rich per-person AI calibration content */
const AI_DEEP_ANALYSIS: Record<
  number,
  {
    headline: string;
    narrative: string[];
    leadershipCues: string[];
    watchouts: string[];
    confidence: 'High' | 'Medium';
    generatedAt: string;
    attribution: string;
    evidence: { category: string; level: string; items: EvidenceItem[] }[];
  }
> = {
  1: {
    headline: 'Clear movement toward senior autonomy and broader influence',
    narrative: [
      `Across ${47} captured touchpoints (360°, peers, leadership, and rituals), the steadiest pattern is owning roadmap decisions, mediating across squads, and following through on commitments made in forums.`,
      'Quarter over quarter, there is less reliance on escalation for scope and more proactive risk and mitigation proposals — consistent with what typically separates an “Exceeds” outcome in calibration.',
      'Most-cited qualitative themes: stakeholder-ready narrative, prioritization under pressure, and informal mentorship of junior PMs.',
    ],
    leadershipCues: [
      'In the formal write-up, cite two concrete product decisions with explicit trade-offs.',
      'Tie business outcomes to behavior (how the person framed uncertainty and aligned the team).',
      'Anchor on recurring feedback themes — avoid stopping at “ships reliably.”',
    ],
    watchouts: [
      'High signal volume can hide blind spots: check for perspectives from less adjacent functions.',
    ],
    confidence: 'High',
    generatedAt: 'May 6, 2026',
    attribution: 'Aggregated from Slack, GitHub, AI tooling, and feedback rituals',
    evidence: [
      {
        category: 'Impact',
        level: 'Level 3',
        items: [
          {
            id: '1',
            title: 'Q2 roadmap prioritized with trade-offs documented for stakeholders',
            sentiment: 'strong',
            source: 'slack',
            ref: '#proj-leads',
            date: 'Apr 12, 2026',
          },
          {
            id: '2',
            title: 'Cross-squad mediation prevented a critical slip on the joint release',
            sentiment: 'strong',
            source: 'other',
            date: 'Mar 28, 2026',
          },
        ],
      },
      {
        category: 'Behavior',
        level: 'Level 3',
        items: [
          {
            id: '3',
            title: 'Informal mentorship cited by three junior PMs in feedback',
            sentiment: 'medium',
            source: 'slack',
            date: 'Apr 8, 2026',
          },
        ],
      },
    ],
  },
  2: {
    headline: 'Strong technical leadership with tension between depth and strategic visibility',
    narrative: [
      `The ${32} records blend code review, incidents, and technical planning. The model sees consistent quality and sound architectural direction.`,
      'Frequent mentions of “unblocking” other engineers; fewer explicit mentions of communication to non-technical partners — useful when calibrating impact beyond code.',
      'Maturity signal: owns incidents without constantly overloading the team.',
    ],
    leadershipCues: [
      'In the final narrative, balance technical depth with one or two examples tied to business priorities.',
      'If the committee pushes back on “High Performer,” bring a technical trade-off that was explained clearly to Product.',
    ],
    watchouts: [
      '“Action Required” status: suggestion and profile rating are misaligned — reconcile with your people partner before the session.',
    ],
    confidence: 'Medium',
    generatedAt: 'May 6, 2026',
    attribution: 'GitHub, incidents, retrospectives',
    evidence: [
      {
        category: 'Impact',
        level: 'Level 2',
        items: [
          {
            id: '1',
            title: 'Critical service refactor reduced P1 incidents',
            sentiment: 'strong',
            source: 'github',
            ref: 'PR #1482',
            date: 'Apr 2, 2026',
          },
        ],
      },
      {
        category: 'Behavior',
        level: 'Level 3',
        items: [
          {
            id: '2',
            title: 'Pairing and unblocking called out in retrospectives',
            sentiment: 'medium',
            source: 'slack',
            date: 'Mar 15, 2026',
          },
        ],
      },
    ],
  },
  3: {
    headline: 'Quality and reliability as a brand — steady cadence',
    narrative: [
      `${28} touchpoints highlight automation, regression coverage, and clear communication on critical bugs.`,
      'Stable pattern without odd spikes: strong fit for a solid “Meets”; call out a differentiator if there is real process innovation.',
    ],
    leadershipCues: ['Highlight quality initiatives that cut rework (metric or anecdote).'],
    watchouts: [],
    confidence: 'High',
    generatedAt: 'May 6, 2026',
    attribution: 'CI/CD, tickets, peer feedback',
    evidence: [
      {
        category: 'Impact',
        level: 'Level 2',
        items: [
          {
            id: '1',
            title: 'Regression suite caught an issue before it shipped in release X',
            sentiment: 'medium',
            source: 'other',
            date: 'Apr 20, 2026',
          },
        ],
      },
    ],
  },
  4: {
    headline: 'High technical impact and a mature production mindset',
    narrative: [
      `${41} signals cluster around APIs, reliability, and documentation. Repeated praise for responsiveness during incidents.`,
      'Signs of senior autonomy: fewer requests for hand-holding on reviews; more proposals for structural improvements.',
    ],
    leadershipCues: ['Tie incidents to shared learning (postmortems, runbooks).'],
    watchouts: [],
    confidence: 'High',
    generatedAt: 'May 6, 2026',
    attribution: 'GitHub, PagerDuty, internal docs',
    evidence: [
      {
        category: 'Impact',
        level: 'Level 3',
        items: [
          {
            id: '1',
            title: 'Stable APIs cited in four pieces of product feedback',
            sentiment: 'strong',
            source: 'github',
            ref: 'PR #2103',
            date: 'Apr 10, 2026',
          },
        ],
      },
    ],
  },
  5: {
    headline: 'Recognized potential with variability in delivery and visibility',
    narrative: [
      `With ${19} touchpoints, volume is below the team average — may reflect tenure or a narrower scope.`,
      'Mixed feedback: positive collaboration in pairing; some mentions of tight deadlines and fragmented focus.',
    ],
    leadershipCues: [
      'For a “Dilemma” placement, document a development plan and expectations for the next two cycles.',
      'Use constructive language tied to observable behaviors.',
    ],
    watchouts: [
      'Action Required: synthesize qualitative evidence before locking a rating — avoid recency bias.',
    ],
    confidence: 'Medium',
    generatedAt: 'May 6, 2026',
    attribution: 'Continuous feedback, 1:1 notes',
    evidence: [
      {
        category: 'Behavior',
        level: 'Level 1',
        items: [
          {
            id: '1',
            title: 'Tight deadlines mentioned across two cycles',
            sentiment: 'medium',
            source: 'slack',
            date: 'Apr 1, 2026',
          },
        ],
      },
    ],
  },
  6: {
    headline: 'Operational consistency and strong cross-functional partnership',
    narrative: [
      `${35} records show coordination on migrations and pipeline governance; recognition for predictability.`,
      'Solid adherence to internal SLAs; few risk flags.',
    ],
    leadershipCues: ['Call out how this person reduced friction between infra and product teams.'],
    watchouts: [],
    confidence: 'High',
    generatedAt: 'May 6, 2026',
    attribution: 'Slack, change records',
    evidence: [
      {
        category: 'Impact',
        level: 'Level 2',
        items: [
          {
            id: '1',
            title: 'Coordinated migration with no prolonged downtime',
            sentiment: 'strong',
            source: 'other',
            date: 'Mar 22, 2026',
          },
        ],
      },
    ],
  },
  7: {
    headline: 'Analysis and data storytelling as a differentiator',
    narrative: [
      `${24} touchpoints reference dashboards, metric definitions, and supporting executive decisions in committees.`,
      'Positive trend translating complexity into action — useful for an impact narrative.',
    ],
    leadershipCues: ['In the review, anchor examples where an insight changed a decision or priority.'],
    watchouts: [],
    confidence: 'Medium',
    generatedAt: 'May 6, 2026',
    attribution: 'Looker, committee decks',
    evidence: [
      {
        category: 'Impact',
        level: 'Level 2',
        items: [
          {
            id: '1',
            title: 'Metrics narrative shifted quarterly prioritization',
            sentiment: 'medium',
            source: 'slack',
            date: 'Apr 5, 2026',
          },
        ],
      },
    ],
  },
};

const PEER_AVATAR_BY_TONE: Record<string, string> = {
  neutral:
    'bg-white text-[#201E73] border-2 border-gray-400 shadow-md ring-2 ring-gray-100 hover:ring-[#201E73]/25',
  emerald:
    'bg-white text-emerald-900 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-100',
  blue: 'bg-white text-blue-900 border-2 border-blue-500 shadow-md ring-2 ring-blue-100',
  rose: 'bg-white text-rose-900 border-2 border-rose-500 shadow-md ring-2 ring-rose-100',
  amber: 'bg-white text-amber-900 border-2 border-amber-500 shadow-md ring-2 ring-amber-100',
};

/** Google Calendar — template event (14:00 local ≈ 17:00 UTC in May) */
const FORUM_GCAL_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=' +
  encodeURIComponent('Performance Forum · Q4 calibration') +
  '&dates=20260515T170000Z/20260515T183000Z' +
  '&details=' +
  encodeURIComponent(
    'Calibration session — align matrix placements and outcomes with the committee.\n\nSuggested prep: review consolidated feedback signals, prepare two observable examples for anyone on the hot seat, bring business impact where it applies.',
  ) +
  '&location=' +
  encodeURIComponent('Room / Meet — link in internal invite');

const PREP_CHECKLIST = [
  'Review consolidated feedback signals per employee',
  'Prepare two observable examples for anyone in active discussion',
  'Bring business-impact data when relevant',
  'Note gaps to align with HR before the forum',
];

function getPeersInBox(team: CalibrationMember[], boxTitle: string): CalibrationMember[] {
  const map: Record<string, string> = {
    'High Po': 'High Po',
    'High Potential': 'High Po',
    'Core Player': 'Core',
    'High Performer': 'High Perf',
  };
  const target = map[boxTitle] ?? boxTitle;
  return team.filter((p) => p.pos === target);
}

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
  peers: CalibrationMember[];
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
      className={`rounded-xl border-2 p-3 sm:p-3.5 flex flex-col min-h-[112px] sm:min-h-[120px] transition-all ${bgColor} ${borderColor} ${
        highlight ? 'shadow-md ring-1 ring-[#201E73]/15' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2 gap-1">
        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight ${titleColor}`}>{title}</span>
        {Icon && <Icon size={14} className={`${titleColor} shrink-0`} strokeWidth={2} />}
      </div>
      <div className="flex flex-wrap gap-2 items-start justify-center flex-1 content-start">
        {peers.length === 0 ? (
          <span className="text-[10px] font-medium text-gray-500 py-2">—</span>
        ) : (
          peers.map((p) => (
            <div
              key={p.id}
              title={p.name}
              aria-label={p.name}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] font-black cursor-help transition-transform hover:scale-105 ${avatarTone}`}
            >
              <span className="pointer-events-none">{p.name.charAt(0)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Calibration() {
  const [view, setView] = useState<'dashboard' | 'preparation'>('preparation');
  const [selectedPeer, setSelectedPeer] = useState(1);
  const [detailTab, setDetailTab] = useState<'form' | 'ai'>('ai');
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [selectedOutcome, setSelectedOutcome] = useState<Record<number, OutcomeLevel>>(() => {
    const o: Record<number, OutcomeLevel> = {};
    TEAM.forEach((m) => {
      o[m.id] = m.suggestedOutcome;
    });
    return o;
  });
  const [confirmedIds, setConfirmedIds] = useState<Set<number>>(new Set());
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingConfirmOutcome, setPendingConfirmOutcome] = useState<OutcomeLevel | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [checklistDone, setChecklistDone] = useState<Record<number, boolean>>({});

  const selected = useMemo(() => TEAM.find((p) => p.id === selectedPeer) ?? TEAM[0], [selectedPeer]);
  const analysis = AI_DEEP_ANALYSIS[selected.id];

  const teamSortedByPriority = useMemo(() => sortTeamByCalibrationPriority(TEAM), []);

  const outcomeForSelected = selectedOutcome[selected.id] ?? selected.suggestedOutcome;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleSaveDraft = () => {
    showToast('Draft saved locally in this prototype.');
  };

  const handleSendForum = () => {
    showToast('Send simulated — production would hook into the cycle workflow.');
  };

  const openConfirmModal = () => {
    setPendingConfirmOutcome(outcomeForSelected);
    setConfirmModalOpen(true);
  };

  const registerResult = () => {
    if (pendingConfirmOutcome == null) return;
    const justId = selected.id;
    const outcome = pendingConfirmOutcome;
    setConfirmModalOpen(false);
    setPendingConfirmOutcome(null);

    const nextConfirmed = new Set([...confirmedIds, justId]);
    setConfirmedIds(nextConfirmed);
    setSelectedOutcome((prev) => ({ ...prev, [justId]: outcome }));
    showToast('Outcome logged for the committee.');

    const idx = TEAM.findIndex((p) => p.id === justId);
    const rotated = [...TEAM.slice(idx + 1), ...TEAM.slice(0, idx)];
    const nextPeer = rotated.find((p) => !nextConfirmed.has(p.id));
    if (nextPeer) {
      window.setTimeout(() => setSelectedPeer(nextPeer.id), 350);
    }
  };

  const goToNextPeer = () => {
    const idx = TEAM.findIndex((p) => p.id === selected.id);
    const rest = [...TEAM.slice(idx + 1), ...TEAM.slice(0, idx)];
    const next = rest.find((p) => p.id !== selected.id);
    if (next) setSelectedPeer(next.id);
  };

  const readyCount = TEAM.filter((p) => p.status === 'Ready').length;
  const actionCount = TEAM.filter((p) => p.status === 'Action Required').length;

  const toggleEvidence = (key: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12 space-y-6 font-['DM_Sans'] text-sm text-gray-700 animate-in fade-in duration-500 bg-[#F8F9FA] min-h-[calc(100vh-6rem)] rounded-2xl p-4 sm:p-6">
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl bg-[#201E73] text-white text-xs font-bold shadow-lg animate-in slide-in-from-bottom-2"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
              Performance Review
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
                view === 'preparation'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}
            >
              Current step: {view === 'preparation' ? 'Per-person prep' : 'Forum & 9-box'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#201E73] tracking-tight mb-1">Calibration Orchestrator</h1>
          <p className="text-sm text-gray-600 font-medium max-w-xl leading-relaxed">
            Align committee decisions with year-to-date context: 9-box map, forum on the calendar, and AI-assisted prep from continuous feedback.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'preparation'}
            onClick={() => setView('preparation')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              view === 'preparation'
                ? 'bg-[#201E73] text-white border-[#201E73] shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Wand2 size={16} strokeWidth={2} />
            Prep / calibration
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'dashboard'}
            onClick={() => setView('dashboard')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              view === 'dashboard'
                ? 'bg-[#201E73] text-white border-[#201E73] shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <LayoutDashboard size={16} strokeWidth={2} />
            Forum &amp; status
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shrink-0 h-fit">
            <Wand2 size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Step 1</p>
            <h2 className="text-lg font-black text-[#201E73] mb-1">Per-person prep</h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              AI summarizes evidence, suggests matrix placement and outcome rating — you confirm the outcome and move to the next employee.
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shrink-0 h-fit">
            <LayoutDashboard size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Step 2</p>
            <h2 className="text-lg font-black text-[#201E73] mb-1">Forum &amp; 9-box</h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              Check the forum date in Google Calendar, the talent map, and who needs attention before the session.
            </p>
          </div>
        </div>
      </div>

      {view === 'dashboard' ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          {/* Performance Forum — compact + Google Calendar + checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-stretch gap-4">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0 h-fit">
                  <CalendarDays size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-[#201E73] leading-tight">Performance Forum · Q4</h2>
                  <p className="text-xs text-gray-600 font-medium mt-1">
                    <Clock size={14} className="inline text-gray-500 mr-1" strokeWidth={2} />
                    May 15, 2026 · 2:00 PM — 4:00 PM
                    <span className="text-gray-500 mx-2">·</span>
                    <Users size={14} className="inline text-gray-500 mr-1" strokeWidth={2} />
                    10 participants
                  </p>
                  <a
                    href={FORUM_GCAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#201E73] hover:text-[#161453] underline-offset-2 hover:underline"
                  >
                    <ExternalLink size={14} strokeWidth={2} />
                    Add to Google Calendar
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:border-l lg:border-gray-100 lg:pl-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={13} strokeWidth={2} /> {readyCount} ready
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertCircle size={13} strokeWidth={2} /> {actionCount} need review
                </span>
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Committee checklist</p>
              <ul className="grid sm:grid-cols-2 gap-2">
                {PREP_CHECKLIST.map((item, i) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                    <button
                      type="button"
                      onClick={() => setChecklistDone((p) => ({ ...p, [i]: !p[i] }))}
                      className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                        checklistDone[i] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                      }`}
                      aria-pressed={!!checklistDone[i]}
                    >
                      {checklistDone[i] ? <Check size={10} strokeWidth={3} /> : null}
                    </button>
                    <span className={checklistDone[i] ? 'text-gray-500 line-through' : ''}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 9-box */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#201E73]/10 text-[#201E73] shrink-0">
                  <LayoutGrid size={22} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#201E73] tracking-tight">9-box map (current cycle)</h2>
                  <p className="text-sm text-gray-600 font-medium mt-1 leading-relaxed max-w-2xl">
                    Team distribution to frame the calibration discussion. Same logic as the Talent Hub — high-contrast initials by quadrant.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <NineBoxCell
                title="Enigma"
                peers={getPeersInBox(TEAM, 'Enigma')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={CircleHelp}
              />
              <NineBoxCell
                title="High Potential"
                peers={getPeersInBox(TEAM, 'High Po')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={TrendingUp}
              />
              <NineBoxCell
                title="Star"
                peers={getPeersInBox(TEAM, 'Star')}
                bgColor="bg-emerald-50"
                borderColor="border-emerald-200"
                titleColor="text-emerald-800"
                tone="emerald"
                icon={Sparkles}
                highlight
              />
              <NineBoxCell
                title="Dilemma"
                peers={getPeersInBox(TEAM, 'Dilemma')}
                bgColor="bg-amber-50"
                borderColor="border-amber-200"
                titleColor="text-amber-800"
                tone="amber"
                icon={AlertCircle}
              />
              <NineBoxCell
                title="Core Player"
                peers={getPeersInBox(TEAM, 'Core')}
                bgColor="bg-blue-50"
                borderColor="border-blue-200"
                titleColor="text-blue-800"
                tone="blue"
                icon={Target}
              />
              <NineBoxCell
                title="High Performer"
                peers={getPeersInBox(TEAM, 'High Perf')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={Award}
              />
              <NineBoxCell
                title="Underperformer"
                peers={getPeersInBox(TEAM, 'Underperformer')}
                bgColor="bg-rose-50"
                borderColor="border-rose-200"
                titleColor="text-rose-800"
                tone="rose"
                icon={AlertTriangle}
                highlight
              />
              <NineBoxCell
                title="Solid"
                peers={getPeersInBox(TEAM, 'Solid')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
              />
              <NineBoxCell
                title="Expert"
                peers={getPeersInBox(TEAM, 'Expert')}
                bgColor="bg-gray-50"
                borderColor="border-gray-200"
                titleColor="text-gray-700"
                tone="neutral"
                icon={Briefcase}
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#201E73] flex items-center gap-2">
                <Sliders size={18} className="text-[#fd6e5e]" strokeWidth={2} /> Team alignment
              </h2>
              <p className="text-xs text-gray-600 font-medium max-w-md">
                Click a row to open detailed prep. Columns mirror the map above.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 bg-white">
                    <th className="align-middle py-3.5 pl-5 pr-3 sm:pl-6 text-left">Employee</th>
                    <th className="align-middle py-3.5 px-3 hidden sm:table-cell text-left">Role</th>
                    <th className="align-middle py-3.5 px-2 hidden md:table-cell text-center">9-box</th>
                    <th className="align-middle py-3.5 px-2 hidden md:table-cell text-center">
                      <span className="inline-flex items-center justify-center gap-1 mx-auto">
                        {EVIDENCE_COUNT_LABEL}
                        <button
                          type="button"
                          className="inline-flex text-gray-500 hover:text-gray-700 cursor-help rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-[#201E73]/25 align-middle shrink-0"
                          title={EVIDENCE_COUNT_TOOLTIP}
                          aria-label={`About ${EVIDENCE_COUNT_LABEL}: ${EVIDENCE_COUNT_TOOLTIP}`}
                        >
                          <Info size={14} strokeWidth={2} aria-hidden />
                        </button>
                      </span>
                    </th>
                    <th className="align-middle py-3.5 pr-5 pl-3 sm:pr-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamSortedByPriority.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPeer(p.id);
                        setView('preparation');
                      }}
                    >
                      <td className="align-middle py-3.5 pl-5 pr-3 sm:pl-6">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border ${
                              p.alert ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-sm flex flex-wrap items-center gap-2">
                              <span className="truncate">{p.name}</span>
                              {confirmedIds.has(p.id) && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                  Logged
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide sm:hidden truncate">
                              {p.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="align-middle py-3.5 px-3 hidden sm:table-cell text-gray-700 font-medium">
                        <span className="line-clamp-2">{p.role}</span>
                      </td>
                      <td className="align-middle py-3.5 px-2 hidden md:table-cell text-center">
                        <span className="inline-flex items-center justify-center mx-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-800 whitespace-nowrap">
                          {p.pos}
                        </span>
                      </td>
                      <td className="align-middle py-3.5 px-2 hidden md:table-cell text-center">
                        <span className="inline-flex items-center justify-center mx-auto min-w-[2.25rem] px-2.5 py-1 rounded-full bg-gray-50 text-gray-800 text-xs font-bold border border-gray-200 tabular-nums">
                          {p.signals}
                        </span>
                      </td>
                      <td className="align-middle py-3.5 pr-5 pl-3 sm:pr-6 text-right">
                        <span
                          className={`inline-flex items-center justify-end gap-1.5 mx-auto sm:ml-auto sm:mr-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${
                            p.status === 'Ready'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {p.status === 'Ready' ? (
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" strokeWidth={2} />
                          ) : (
                            <AlertTriangle size={13} className="text-rose-600 shrink-0" strokeWidth={2} />
                          )}
                          {p.status === 'Ready' ? 'Ready' : 'Action required'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Lista */}
            <div className="lg:col-span-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1 mb-2">Employees</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 max-h-[640px] overflow-y-auto custom-scrollbar">
                {teamSortedByPriority.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPeer(p.id)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all mb-1 last:mb-0 flex items-center gap-3 ${
                      selectedPeer === p.id
                        ? 'border-[#201E73] bg-[#201E73]/5 shadow-sm'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        selectedPeer === p.id ? 'bg-[#201E73] text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-gray-900 truncate flex items-center gap-2">
                        {p.name}
                        {confirmedIds.has(p.id) ? (
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" strokeWidth={2} />
                        ) : null}
                      </div>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">{p.role}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-600" title={EVIDENCE_COUNT_TOOLTIP}>
                          {p.signals} signals
                        </span>
                        {p.alert && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Attention
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-500 shrink-0" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={goToNextPeer}
                className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[#201E73] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                Next employee <ChevronRight size={14} />
              </button>
            </div>

            {/* Main panel — pre-work style */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pre-work</p>
                    <h2 className="text-lg font-black text-[#201E73] tracking-tight truncate">{selected.name}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50 shadow-sm transition-all"
                    >
                      <Save size={16} strokeWidth={2} />
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSendForum}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#201E73] text-white text-xs font-bold hover:bg-[#161453] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <Send size={16} strokeWidth={2} />
                      Send
                    </button>
                  </div>
                </div>

                {/* Card info + forum reminder */}
                <div className="p-5 border-b border-gray-100 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[#201E73]/10 text-[#201E73] flex items-center justify-center font-black text-lg border border-[#201E73]/20 shrink-0">
                        {selected.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base leading-tight">{selected.name}</p>
                        <p className="text-sm text-gray-600 font-medium">{selected.role}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center self-start text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800">
                      Last cycle: <span className="text-[#201E73] ml-1">{selected.lastCycleBox}</span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <CalendarDays size={18} className="text-emerald-800 shrink-0" strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-950">Performance Forum · reminder</p>
                      <p className="text-[11px] text-emerald-900 font-medium">May 15 · 2:00 PM — sync with your calendar.</p>
                    </div>
                    <a
                      href={FORUM_GCAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 shrink-0 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-[11px] font-bold hover:bg-emerald-100/50 transition-colors"
                    >
                      <ExternalLink size={14} />
                      Google Calendar
                    </a>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-5 gap-6">
                  <button
                    type="button"
                    onClick={() => setDetailTab('form')}
                    className={`flex items-center gap-2 py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${
                      detailTab === 'form'
                        ? 'border-[#201E73] text-[#201E73]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText size={16} strokeWidth={2} />
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('ai')}
                    className={`flex items-center gap-2 py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${
                      detailTab === 'ai'
                        ? 'border-[#201E73] text-[#201E73]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Sparkles size={16} className="text-[#fd6e5e]" strokeWidth={2} />
                    AI suggestion
                  </button>
                </div>

                <div className="p-5 sm:p-6">
                  {detailTab === 'form' ? (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Notes for the committee</label>
                      <textarea
                        value={draftNotes[selected.id] ?? ''}
                        onChange={(e) => setDraftNotes((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                        placeholder="E.g. points to advocate for, risks, prior alignment with HR…"
                        rows={8}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 font-medium outline-none focus:ring-2 focus:ring-[#201E73]/20 focus:border-[#201E73]/40 resize-y min-h-[200px]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/90 p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[#201E73]">
                            <Brain size={18} strokeWidth={2} />
                            <h3 className="font-black text-sm uppercase tracking-wide">AI-generated analysis</h3>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Confidence: {analysis.confidence === 'High' ? 'high' : 'medium'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          Generated on {analysis.generatedAt} · {analysis.attribution}
                        </p>
                        <p className="text-sm font-bold text-gray-900 leading-snug border-l-4 border-[#fd6e5e] pl-4 py-0.5">{analysis.headline}</p>
                        <div className="space-y-3">
                          {analysis.narrative.map((para, i) => (
                            <p key={i} className="text-sm text-gray-700 font-medium leading-relaxed">
                              {para}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Quadrante sugerido */}
                      <div className="rounded-2xl border-2 border-[#201E73]/20 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Suggested quadrant (9-box)</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-[#201E73] text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md ring-4 ring-[#201E73]/10">
                            {selected.boxNumber}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-lg">{selected.pos}</p>
                            <p className="text-sm text-gray-600 font-medium mt-1">
                              Impact {selected.matrixCoords.impact} · Behavior {selected.matrixCoords.behavior}
                            </p>
                            <p className="text-xs text-gray-500 font-medium mt-2">
                              Suggested performance narrative: <span className="text-[#201E73] font-bold">{selected.suggested}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Four-point rating scale */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Outcome (four-point scale)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {OUTCOME_SCALE.map((o) => {
                            const active = outcomeForSelected === o.key;
                            return (
                              <button
                                key={o.key}
                                type="button"
                                onClick={() => setSelectedOutcome((prev) => ({ ...prev, [selected.id]: o.key }))}
                                className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
                                  active
                                    ? 'border-[#201E73] bg-[#201E73]/5 shadow-sm ring-1 ring-[#201E73]/15'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">{o.hint}</span>
                                <span className="block text-sm font-black text-gray-900 mt-0.5">{o.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutcome((prev) => ({ ...prev, [selected.id]: selected.suggestedOutcome }));
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#fd6e5e] text-white font-bold text-sm shadow-sm hover:bg-[#e65c4c] hover:-translate-y-0.5 hover:shadow-md transition-all"
                      >
                        <Check size={16} strokeWidth={2} />
                        Apply suggestion (quadrant + scale)
                      </button>

                      {/* Evidence */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Compiled history (evidence)</p>
                        <div className="space-y-2">
                          {analysis.evidence.map((block) => (
                            <div key={block.category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleEvidence(`${selected.id}-${block.category}`)}
                                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50/80 hover:bg-gray-50 text-left"
                              >
                                <span className="text-xs font-black text-gray-900">
                                  {block.category}{' '}
                                  <span className="text-[10px] font-bold text-gray-500 ml-1">
                                    {block.level} · {block.items.length} item{block.items.length !== 1 ? 's' : ''}
                                  </span>
                                </span>
                                {expandedEvidence[`${selected.id}-${block.category}`] ? (
                                  <ChevronUp size={16} className="text-gray-500 shrink-0" />
                                ) : (
                                  <ChevronDown size={16} className="text-gray-500 shrink-0" />
                                )}
                              </button>
                              {expandedEvidence[`${selected.id}-${block.category}`] && (
                                <ul className="divide-y divide-gray-100 px-4 py-2">
                                  {block.items.map((ev) => (
                                    <li key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2 text-xs">
                                      <span
                                        className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                          ev.sentiment === 'strong'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                      >
                                        {ev.sentiment === 'strong' ? 'Strong' : 'Moderate'}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 leading-snug">{ev.title}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-500 font-medium">
                                          {ev.source === 'github' && (
                                            <span className="inline-flex items-center gap-1">
                                              <Github size={12} /> {ev.ref}
                                            </span>
                                          )}
                                          {ev.source === 'slack' && (
                                            <span className="inline-flex items-center gap-1">
                                              <MessageSquare size={12} /> Slack
                                            </span>
                                          )}
                                          {ev.source === 'other' && (
                                            <span className="inline-flex items-center gap-1">
                                              <MessageSquareQuote size={12} /> Context
                                            </span>
                                          )}
                                          <span>{ev.date}</span>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                          <div className="flex items-center gap-2 text-emerald-800 mb-2">
                            <TrendingUp size={16} strokeWidth={2} />
                            <span className="text-xs font-black uppercase tracking-wide">Leadership cues</span>
                          </div>
                          <ul className="text-xs text-emerald-900 font-medium space-y-2 list-disc list-inside leading-relaxed">
                            {analysis.leadershipCues.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                          <div className="flex items-center gap-2 text-blue-800 mb-2">
                            <Shield size={16} strokeWidth={2} />
                            <span className="text-xs font-black uppercase tracking-wide">Responsible calibration</span>
                          </div>
                          {analysis.watchouts.length > 0 ? (
                            <ul className="text-xs text-blue-900 font-medium space-y-2 list-disc list-inside leading-relaxed">
                              {analysis.watchouts.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-blue-900 font-medium leading-relaxed">
                              No automatic flags — keep cross-checking with your direct observation.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                        <Lightbulb size={18} className="text-amber-800 shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-xs text-amber-950 font-medium leading-relaxed">
                          <span className="font-black text-amber-900">Reminder:</span> AI organizes inputs; the final call sits with the committee and leadership.
                        </p>
                      </div>

                      {/* Confirm */}
                      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900">Confirm calibration outcome</p>
                          {confirmedIds.has(selected.id) ? (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Logged this session
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-600 font-medium">
                          Selected outcome:{' '}
                          <strong className="text-[#201E73]">
                            {OUTCOME_SCALE.find((x) => x.key === outcomeForSelected)?.label} —{' '}
                            {OUTCOME_SCALE.find((x) => x.key === outcomeForSelected)?.hint}
                          </strong>{' '}
                          · Reference quadrant: <strong>{selected.pos}</strong>
                        </p>
                        <button
                          type="button"
                          disabled={confirmedIds.has(selected.id)}
                          onClick={openConfirmModal}
                          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            confirmedIds.has(selected.id)
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-[#201E73] text-white hover:bg-[#161453] shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                          }`}
                        >
                          <CheckCircle2 size={18} strokeWidth={2} />
                          Confirm and log outcome
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#201E73]/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cal-confirm-title"
          >
            <div className="p-6 sm:p-7">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-200">
                <CheckCircle2 size={24} strokeWidth={2} />
              </div>
              <h3 id="cal-confirm-title" className="text-lg font-black text-[#201E73] mb-2">
                Log with the committee?
              </h3>
              <p className="text-sm text-gray-600 font-medium leading-relaxed mb-1">
                <strong className="text-gray-900">{selected.name}</strong> will be logged with outcome{' '}
                <strong className="text-[#201E73]">
                  {pendingConfirmOutcome &&
                    OUTCOME_SCALE.find((x) => x.key === pendingConfirmOutcome)?.label}
                </strong>{' '}
                and reference quadrant <strong>{selected.pos}</strong>.
              </p>
              <p className="text-xs text-gray-500 font-medium mt-3">
                After you confirm, you can move on to another employee in the list.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModalOpen(false);
                    setPendingConfirmOutcome(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={registerResult}
                  className="flex-1 py-2.5 rounded-xl bg-[#201E73] text-white text-sm font-bold hover:bg-[#161453] shadow-sm"
                >
                  Confirm log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
