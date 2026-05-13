import { TrendingUp, Lightbulb, Users, ArrowUpRight, Calendar, MessageCircle, Target, Trophy, Sparkles, ChevronRight, BarChart2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function ResultsPage() {
  const radarData = [
    { vector: 'Transform', score: 4.2, fullMark: 5, id: 'transform' },
    { vector: 'Innovate', score: 3.8, fullMark: 5, id: 'innovate' },
    { vector: 'Collaborate', score: 4.5, fullMark: 5, id: 'collaborate' },
  ];

  const historicalData = [
    { cycle: 'Q4 2024', transform: 3.9, innovate: 3.7, collaborate: 4.3, id: 'q4-2024' },
    { cycle: 'Q1 2025', transform: 4.0, innovate: 3.8, collaborate: 4.4, id: 'q1-2025' },
    { cycle: 'Q2 2025', transform: 4.2, innovate: 3.8, collaborate: 4.5, id: 'q2-2025' },
  ];

  const vectors = [
    {
      name: 'Entrega Real',
      subtitle: 'Transform',
      icon: TrendingUp,
      color: 'navy',
      score: 4.2,
      change: +0.2,
      pdmFeedback: 'Ana teve entregas excepcionais neste ciclo. Liderou a refatoração do módulo de autenticação, resultando em melhoria significativa na segurança e performance. Demonstra profundo conhecimento técnico e capacidade de traduzir requisitos complexos em soluções elegantes.',
      keyFeedbacks: [
        { from: 'Carlos Mendes', comment: 'Excelente trabalho na refatoração do módulo de autenticação.' },
        { from: 'Tech Team', comment: 'Qualidade do código e abordagem sistemática foram exemplares.' },
      ],
    },
    {
      name: 'Aplicação Prática',
      subtitle: 'Innovate',
      icon: Lightbulb,
      color: 'coral',
      score: 3.8,
      change: 0,
      pdmFeedback: 'Bom uso de ferramentas de IA nas revisões de código. Seria interessante explorar mais aplicações práticas de machine learning nos projetos.',
      keyFeedbacks: [
        { from: 'Bruno Alves', comment: 'Ótima aplicação de IA nas revisões de código.' },
        { from: 'Innovation Team', comment: 'Demonstra uso crítico e consciente das ferramentas.' },
      ],
    },
    {
      name: 'Comportamentos',
      subtitle: 'Collaborate',
      icon: Users,
      color: 'teal',
      score: 4.5,
      change: +0.1,
      pdmFeedback: 'Colaboração exemplar com o time. Sempre disponível para ajudar colegas e compartilha conhecimento de forma proativa. Contribui significativamente para o ambiente positivo da equipe.',
      keyFeedbacks: [
        { from: 'Marina Costa', comment: 'Sempre colaborativa e disposta a compartilhar conhecimento.' },
        { from: 'Team Members', comment: 'A parceria no projeto de acessibilidade foi fundamental.' },
      ],
    },
  ];

  const developmentPlan = [
    {
      vector: 'Transform',
      actions: [
        'Liderar próximo projeto de arquitetura de sistemas',
        'Aprofundar conhecimento em design patterns avançados',
        'Mentorear desenvolvedores júnior',
      ],
      color: 'navy'
    },
    {
      vector: 'Innovate',
      actions: [
        'Explorar aplicações de Machine Learning',
        'Participar de hackathons e eventos',
        'Criar POCs de novas tecnologias emergentes',
      ],
      color: 'coral'
    },
    {
      vector: 'Collaborate',
      actions: [
        'Organizar tech talks internos',
        'Expandir colaboração cross-team',
        'Contribuir com documentação técnica',
      ],
      color: 'teal'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
            <Trophy className="text-[var(--coral-500)]" size={32} strokeWidth={2.5} />
            Resultados do Ciclo
          </h1>
          <p className="text-slate-500 text-lg">
            Aqui estão seus resultados consolidados e os próximos passos para sua evolução.
          </p>
        </div>
      </div>

      {/* Overall Score Card - Redesigned to fit fluidly with the new colors */}
      <div className="rounded-3xl p-8 sm:p-12 relative overflow-hidden bg-[var(--navy-500)] shadow-lg">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[var(--navy-500)] to-[var(--navy-900)] opacity-90 z-0" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[var(--coral-500)] rounded-full blur-[100px] opacity-40 z-0" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-6 shadow-sm">
              Performance Review • Q2 2025
            </div>
            <div className="text-[var(--navy-100)] font-bold uppercase tracking-widest text-sm mb-2">Nota Final</div>
            <div className="flex items-baseline gap-4">
              <h2 className="text-7xl sm:text-8xl font-black text-white leading-none tracking-tighter drop-shadow-sm">
                4.2
              </h2>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--coral-500)] text-white font-bold text-sm shadow-[0_4px_14px_rgba(226,108,28,0.4)]">
                <ArrowUpRight size={16} strokeWidth={3} />
                +0.2 vs Q1
              </div>
            </div>
          </div>
          <div className="text-left md:text-right bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="text-xs font-bold text-[var(--navy-100)] uppercase tracking-widest mb-1">
              Data de Publicação
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[var(--coral-300)]" />
              15 de Maio, 2026
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--navy-50)] text-[var(--navy-500)] rounded-xl">
              <Target size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Desempenho por Vetor</h3>
              <p className="text-sm text-slate-500">Distribuição das suas notas</p>
            </div>
          </div>
          <div className="flex-1 min-h-[320px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid key="polar-grid" stroke="var(--slate-200)" />
                <PolarAngleAxis
                  key="polar-angle"
                  dataKey="vector"
                  tick={{ fill: 'var(--slate-600)', fontSize: 13, fontWeight: 700 }}
                />
                <Radar
                  key="radar-score"
                  name="Score"
                  dataKey="score"
                  stroke="var(--coral-500)"
                  fill="var(--coral-500)"
                  fillOpacity={0.2}
                  strokeWidth={3}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Trend */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[var(--teal-50)] text-[var(--teal-600)] rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Evolução Histórica</h3>
              <p className="text-sm text-slate-500">Progresso ao longo dos ciclos</p>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] mb-6 w-full">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--slate-100)" vertical={false} />
                <XAxis
                  key="xaxis"
                  dataKey="cycle"
                  tick={{ fill: 'var(--slate-500)', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  key="yaxis"
                  domain={[0, 5]}
                  tick={{ fill: 'var(--slate-500)', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  key="tooltip"
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    fontWeight: 700,
                  }}
                />
                <Line key="line-transform" type="monotone" dataKey="transform" stroke="var(--navy-500)" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} isAnimationActive={false} />
                <Line key="line-innovate" type="monotone" dataKey="innovate" stroke="var(--coral-500)" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} isAnimationActive={false} />
                <Line key="line-collaborate" type="monotone" dataKey="collaborate" stroke="var(--teal-500)" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 bg-slate-50 p-4 rounded-2xl">
            {[
              { label: 'Transform', color: 'navy' },
              { label: 'Innovate', color: 'coral' },
              { label: 'Collaborate', color: 'teal' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-md bg-[var(--${item.color}-500)] shadow-sm`} />
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vector Breakdown */}
      <div>
        <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <BarChart2 className="text-[var(--navy-500)]" />
          Detalhamento por Vetor
        </h3>
        <div className="space-y-6">
          {vectors.map((vector, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 hover:shadow-md transition-shadow">
              {/* Score Side */}
              <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8 flex flex-col justify-center text-center md:text-left">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 bg-[var(--${vector.color}-100)] text-[var(--${vector.color}-600)] shadow-sm`}>
                  <vector.icon size={32} strokeWidth={2.5} />
                </div>
                <div className={`text-xs font-black uppercase tracking-widest text-[var(--${vector.color}-600)] mb-1`}>
                  {vector.subtitle}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">
                  {vector.name}
                </h4>
                <div className="flex items-baseline justify-center md:justify-start gap-2 mb-3 bg-slate-50 py-3 rounded-2xl border border-slate-100">
                  <span className={`text-5xl font-black text-[var(--${vector.color}-600)] pl-4`}>
                    {vector.score}
                  </span>
                  <span className="text-slate-400 font-bold pr-4">/ 5.0</span>
                </div>
                {vector.change !== 0 && (
                  <div className={`inline-flex items-center justify-center md:justify-start gap-1 font-bold text-sm ${vector.change > 0 ? 'text-[var(--teal-600)]' : 'text-[var(--coral-600)]'}`}>
                    <ArrowUpRight size={16} strokeWidth={3} />
                    {vector.change > 0 ? '+' : ''}{vector.change} vs anterior
                  </div>
                )}
              </div>

              {/* Feedback Side */}
              <div className="flex-1 flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="text-[var(--navy-400)]" size={20} />
                    <h5 className="text-lg font-bold text-slate-800">Visão da Liderança (PDM)</h5>
                  </div>
                  <div className="bg-[var(--navy-50)] rounded-2xl p-6 text-[var(--navy-900)] font-medium leading-relaxed relative border border-[var(--navy-100)]">
                    {vector.pdmFeedback}
                  </div>
                </div>

                <div>
                  <h5 className="text-lg font-bold text-slate-800 mb-3">Destaques do 360°</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vector.keyFeedbacks.map((feedback, fIdx) => (
                      <div key={fIdx} className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-[var(--${vector.color}-300)] transition-colors`}>
                        <div className={`flex items-center gap-2 mb-2`}>
                          <div className={`w-2 h-2 rounded-full bg-[var(--${vector.color}-500)]`} />
                          <div className={`text-xs font-black uppercase tracking-wider text-slate-500`}>
                            {feedback.from}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 font-medium italic">"{feedback.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Development Plan */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--navy-100)] flex items-center justify-center text-[var(--navy-600)] shadow-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Plano de Desenvolvimento</h3>
              <p className="text-sm text-slate-500 font-medium">Sugestões de I.A. baseadas no seu perfil e resultados.</p>
            </div>
          </div>
          <button className="px-6 py-3 rounded-xl bg-[var(--navy-500)] text-white font-bold text-sm hover:bg-[var(--navy-700)] transition-colors shadow-md flex items-center gap-2">
            <Target size={18} />
            Adicionar ao meu PDI
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {developmentPlan.map((plan, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all hover:-translate-y-1">
              <div className={`absolute top-0 left-0 w-full h-2 bg-[var(--${plan.color}-500)]`} />
              <div className={`text-sm font-black uppercase tracking-widest text-[var(--${plan.color}-500)] mb-4`}>
                {plan.vector}
              </div>
              <ul className="space-y-4">
                {plan.actions.map((action, aIdx) => (
                  <li key={aIdx} className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
                    <ChevronRight size={16} className={`shrink-0 mt-0.5 text-[var(--${plan.color}-500)]`} />
                    <span className="text-sm text-slate-700 font-medium leading-snug">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Reaction Section */}
      <div className="bg-[var(--navy-50)] border border-[var(--navy-100)] rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden mt-8">
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <h3 className="text-2xl font-black text-slate-900 mb-3">Qual a sua visão sobre esses resultados?</h3>
          <p className="text-slate-600 mb-6 font-medium">Compartilhe suas reflexões com seu PDM antes do próximo 1:1. Isso ajuda a calibrar expectativas e construir um PDI efetivo.</p>
          <textarea
            rows={4}
            placeholder="Gostei muito dos pontos levantados sobre..."
            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-slate-700 text-base shadow-inner focus:outline-none focus:ring-4 focus:ring-[var(--navy-100)] focus:border-[var(--navy-300)] mb-6 resize-y"
          />
          <button className="px-8 py-3.5 rounded-xl bg-[var(--coral-500)] text-white font-bold shadow-[0_4px_14px_rgba(226,108,28,0.4)] hover:-translate-y-0.5 hover:bg-[var(--coral-600)] transition-all w-full sm:w-auto text-lg">
            Enviar Reflexão
          </button>
        </div>
      </div>
    </div>
  );
}