import { Clock, ArrowRight, TrendingUp, Lightbulb, Users, Calendar, CheckCircle2, Circle, AlertCircle, ChevronRight, Zap, Target, MessageSquare, BarChart2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';

export default function HomePage() {
  const radarData = [
    { vector: 'Transform', score: 4.2, fullMark: 5, id: 'transform' },
    { vector: 'Innovate', score: 3.8, fullMark: 5, id: 'innovate' },
    { vector: 'Collaborate', score: 4.5, fullMark: 5, id: 'collaborate' },
  ];

  const feedbacks = [
    {
      name: 'Carlos Mendes',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
      role: 'Tech Lead',
      feedback: 'A refatoração do módulo de autenticação foi espetacular! O código ficou limpo, testável e mais performático.',
      type: 'Superação',
      typeColor: 'teal',
      date: 'Ontem',
    },
    {
      name: 'Marina Costa',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
      role: 'Product Designer',
      feedback: 'Senti falta de um pouco mais de cuidado com os detalhes de acessibilidade na última entrega.',
      type: 'Atenção',
      typeColor: 'amber',
      date: '3 dias atrás',
    },
    {
      name: 'Bruno Alves',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
      role: 'Senior Developer',
      feedback: 'Excelente postura colaborativa durante o incidente de sexta-feira. Ajudou muito a acalmar o time.',
      type: 'Exemplo',
      typeColor: 'navy',
      date: '1 semana atrás',
    },
  ];

  const actionItems = [
    {
      icon: Target,
      title: 'Completar Autoavaliação',
      subtitle: 'Ciclo Q2 2025 • Impacta na sua avaliação final',
      deadline: 'Termina em 5 dias',
      urgent: true,
      color: 'coral'
    },
    {
      icon: MessageSquare,
      title: 'Dar Feedback para João Silva',
      subtitle: 'João solicitou sua visão sobre o Projeto X',
      deadline: 'Sugerido: próximos 7 dias',
      urgent: false,
      color: 'amber'
    },
    {
      icon: Calendar,
      title: 'Agendar Check-in 1:1',
      subtitle: 'Com seu PDM (Lucas Oliveira)',
      deadline: 'Recomendado este mês',
      urgent: false,
      color: 'navy'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--navy-50)] rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Olá, Ana! 👋</h1>
          <p className="text-slate-500 text-base">Bem-vinda ao seu painel. Você tem <strong className="text-[var(--coral-500)]">1 ação urgente</strong> para esta semana.</p>
        </div>
        <div className="relative z-10 flex gap-3">
          <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-[var(--navy-700)] bg-[var(--navy-50)] hover:bg-[var(--navy-100)] transition-colors flex items-center gap-2">
            <MessageSquare size={18} />
            Solicitar Feedback
          </button>
          <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[var(--navy-500)] hover:bg-[var(--navy-700)] transition-colors shadow-md flex items-center gap-2">
            <Target size={18} />
            Minhas Metas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Progress & Actions (Takes 8 columns on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Active Cycle Card - Redesigned to be clearer */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--coral-100)] text-[var(--coral-600)] text-xs font-bold mb-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--coral-500)] animate-pulse" />
                  Ciclo Ativo • Q2 2025
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Fase de Autoavaliação</h2>
                <p className="text-slate-500 text-sm max-w-md">Reflita sobre suas entregas, desafios e aprendizados neste trimestre. Isso guiará a conversa com seu PDM.</p>
              </div>
              <div className="flex flex-col items-end bg-[var(--coral-50)] rounded-2xl p-4 border border-[var(--coral-100)] min-w-[120px]">
                <div className="text-3xl font-black text-[var(--coral-500)] mb-1">5 <span className="text-sm text-[var(--coral-600)] font-medium">dias</span></div>
                <div className="text-xs text-[var(--coral-600)] font-bold uppercase tracking-wider">Restantes</div>
              </div>
            </div>

            {/* Fluid Timeline */}
            <div className="relative mb-8 pt-4">
              <div className="absolute top-[28px] left-0 right-0 h-1.5 bg-slate-100 rounded-full" />
              <div className="absolute top-[28px] left-0 w-[45%] h-1.5 bg-[var(--coral-500)] rounded-full transition-all duration-1000" />
              
              <div className="relative flex justify-between">
                {[
                  { label: 'Metas', state: 'done' },
                  { label: 'Check-in', state: 'done' },
                  { label: 'Autoavaliação', state: 'active' },
                  { label: 'Avaliação PDM', state: 'pending' },
                  { label: 'Calibração', state: 'pending' },
                ].map((phase, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3 relative z-10 w-16">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-transform ${
                      phase.state === 'done' ? 'bg-[var(--navy-500)] text-white' :
                      phase.state === 'active' ? 'bg-[var(--coral-500)] text-white shadow-[0_0_0_4px_rgba(226,108,28,0.2)] scale-110' :
                      'bg-slate-200 text-slate-400'
                    }`}>
                      {phase.state === 'done' ? <CheckCircle2 size={20} strokeWidth={3} /> : <span className="text-sm font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[11px] font-bold text-center leading-tight ${
                      phase.state === 'active' ? 'text-[var(--coral-600)]' : 'text-slate-500'
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--coral-500)] text-white font-bold hover:bg-[var(--coral-600)] transition-colors shadow-[0_4px_14px_rgba(226,108,28,0.3)] hover:-translate-y-0.5">
              Iniciar Autoavaliação
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Action Items List */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="text-[var(--amber-500)]" size={24} fill="currentColor" />
                Sua Agenda
              </h3>
              <button className="text-sm font-bold text-[var(--navy-500)] hover:text-[var(--navy-700)] transition-colors">Ver todas as tarefas</button>
            </div>
            <div className="grid gap-4">
              {actionItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-5 hover:shadow-md transition-all cursor-pointer group hover:border-[var(--navy-100)]">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`} style={{ backgroundColor: `var(--${item.color}-100)`, color: `var(--${item.color}-600)` }}>
                    <item.icon size={26} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                      {item.urgent && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[var(--coral-100)] text-[var(--coral-600)] flex items-center gap-1">
                          <AlertCircle size={12} /> Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{item.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg shrink-0">
                    <Clock size={16} className={item.urgent ? 'text-[var(--coral-500)]' : 'text-slate-400'} />
                    <span className={item.urgent ? 'text-[var(--coral-600)]' : ''}>{item.deadline}</span>
                  </div>
                  <div className="hidden sm:flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--navy-500)]">
                    <ChevronRight size={24} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Insights & Feedbacks */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Performance Snapshot */}
          <div className="bg-[var(--navy-900)] rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--navy-700)] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BarChart2 size={20} className="text-[var(--coral-500)]" />
                  Seus Vetores
                </h3>
                <span className="text-xs font-medium bg-[var(--navy-700)] px-2 py-1 rounded-md text-[var(--navy-100)]">Q1 2025</span>
              </div>
              
              <div className="flex justify-center mb-6 h-[200px]">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                    <PolarGrid key="polar-grid" stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis 
                      key="polar-angle"
                      dataKey="vector" 
                      tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }} 
                    />
                    <Radar
                      key="radar-score"
                      name="Score"
                      dataKey="score"
                      stroke="var(--coral-500)"
                      strokeWidth={3}
                      fill="var(--coral-500)"
                      fillOpacity={0.2}
                      isAnimationActive={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Transform', score: 4.2 },
                  { label: 'Innovate', score: 3.8 },
                  { label: 'Collaborate', score: 4.5 },
                ].map((v) => (
                  <div key={v.label} className="flex items-center justify-between bg-[var(--navy-700)] bg-opacity-50 p-3 rounded-xl">
                    <span className="text-sm font-medium text-[var(--navy-100)]">{v.label}</span>
                    <span className="text-base font-bold text-white">{v.score} <span className="text-xs text-[var(--navy-300)] font-normal">/ 5</span></span>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-6 py-3 rounded-xl font-bold text-sm text-[var(--navy-900)] bg-white hover:bg-slate-100 transition-colors">
                Ver Resultados Completos
              </button>
            </div>
          </div>

          {/* Quick Feedback Highlight */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Último Feedback</h3>
              <button className="text-[var(--navy-500)] p-1 hover:bg-[var(--navy-50)] rounded-lg transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img src={feedbacks[0].avatar} alt={feedbacks[0].name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-50" />
                <div>
                  <div className="font-bold text-slate-900 text-sm">{feedbacks[0].name}</div>
                  <div className="text-xs text-slate-500">{feedbacks[0].role}</div>
                </div>
                <span className={`ml-auto px-2 py-1 rounded-md text-[10px] font-bold bg-[var(--${feedbacks[0].typeColor}-50)] text-[var(--${feedbacks[0].typeColor}-600)] uppercase tracking-wider`}>
                  {feedbacks[0].type}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl relative">
                <div className="absolute top-0 left-4 w-4 h-4 bg-slate-50 -translate-y-1/2 rotate-45" />
                <p className="text-sm text-slate-700 italic relative z-10 leading-relaxed">
                  "{feedbacks[0].feedback}"
                </p>
              </div>
              <div className="text-xs text-slate-400 font-medium text-right mt-1">{feedbacks[0].date}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}