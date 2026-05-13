import { Calendar, Users, CheckCircle2, Clock, FileText, ExternalLink, Edit2, Target, Lightbulb } from 'lucide-react';

export default function CalibrationPage() {
  const calibrationSessions = [
    {
      date: '20 mai 2026',
      time: '14:00 - 16:00',
      participants: ['Maria Silva (PDM)', 'João Costa (PDM)', 'Pedro Santos (PDM)', 'Ana Lima (HR)'],
      status: 'upcoming',
      agenda: 'Calibração Q2 2025 - Time Platform',
    },
  ];

  const employees = [
    {
      name: 'João Silva',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=faces',
      role: 'Backend Developer',
      transform: 4,
      innovate: 4,
      collaborate: 5,
      overall: 4.3,
      status: 'pending',
    },
    {
      name: 'Maria Santos',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
      role: 'Frontend Developer',
      transform: 5,
      innovate: 4,
      collaborate: 4,
      overall: 4.3,
      status: 'reviewed',
    },
    {
      name: 'Pedro Costa',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
      role: 'DevOps Engineer',
      transform: 3,
      innovate: 4,
      collaborate: 4,
      overall: 3.7,
      status: 'pending',
    },
    {
      name: 'Ana Paula',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
      role: 'QA Analyst',
      transform: 4,
      innovate: 3,
      collaborate: 5,
      overall: 4.0,
      status: 'reviewed',
    },
  ];

  const preworkChecklist = [
    { task: 'Completar todas as avaliações do time', completed: true },
    { task: 'Revisar autoavaliações dos colaboradores', completed: true },
    { task: 'Consolidar feedbacks recebidos', completed: true },
    { task: 'Preparar justificativas para ratings', completed: false },
    { task: 'Revisar distribuição de ratings (evitar viés)', completed: false },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
          <Users className="text-[var(--navy-500)]" size={32} />
          Calibração de Performance
        </h1>
        <p className="text-slate-500 font-medium">
          Fórum de alinhamento e calibração de resultados do seu time
        </p>
      </div>

      {/* Top Section - Calendar & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Session */}
        <div className="lg:col-span-2 bg-[var(--navy-500)] rounded-3xl p-8 sm:p-10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[var(--navy-300)] to-transparent rounded-full blur-[100px] opacity-30 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold mb-4 backdrop-blur-md border border-white/20">
                <Calendar size={14} /> Próxima Sessão
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
                {calibrationSessions[0].agenda}
              </h2>
              <p className="text-[var(--navy-100)] text-lg font-medium flex items-center gap-2">
                <Clock size={18} className="text-[var(--coral-300)]" />
                {calibrationSessions[0].date} • {calibrationSessions[0].time}
              </p>
            </div>
            <button className="hidden sm:flex shrink-0 items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white hover:text-[var(--navy-500)] transition-all backdrop-blur-md shadow-sm">
              <ExternalLink size={20} />
            </button>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 mt-auto">
            <div>
              <div className="text-[var(--navy-100)] text-xs font-bold uppercase tracking-wider mb-3">Participantes ({calibrationSessions[0].participants.length})</div>
              <div className="flex flex-wrap gap-2">
                {calibrationSessions[0].participants.map((participant, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium backdrop-blur-sm">
                    {participant}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[var(--coral-500)] text-white text-sm font-bold shrink-0 shadow-[0_4px_14px_rgba(226,108,28,0.4)]">
              <Clock size={18} />
              Faltam 2 dias para o fechamento
            </div>
          </div>
        </div>

        {/* Prework Checklist */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--teal-50)] text-[var(--teal-600)] flex items-center justify-center shrink-0">
              <FileText size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">Prework da Sessão</h3>
              <p className="text-xs font-medium text-slate-500">Tarefas prévias à calibração</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {preworkChecklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 group">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.completed ? 'bg-[var(--teal-500)] text-white shadow-sm' : 'bg-slate-50 border border-slate-200 group-hover:border-slate-300'}`}>
                  {item.completed && <CheckCircle2 size={14} strokeWidth={3} />}
                </div>
                <span className={`text-sm font-medium leading-snug transition-colors ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {item.task}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              <span>Progresso Atual</span>
              <span>{preworkChecklist.filter((i) => i.completed).length} de {preworkChecklist.length}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-slate-100">
              <div
                className="h-full bg-[var(--teal-500)] transition-all duration-1000"
                style={{ width: `${(preworkChecklist.filter((i) => i.completed).length / preworkChecklist.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Transform (Média)', value: '3.8', icon: Target, color: 'navy' },
          { label: 'Innovate (Média)', value: '3.8', icon: Lightbulb, color: 'coral' },
          { label: 'Collaborate (Média)', value: '4.3', icon: Users, color: 'teal' },
          { label: 'Nota Geral Média', value: '4.1', icon: CheckCircle2, color: 'slate' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[var(--${stat.color}-50)] text-[var(--${stat.color}-600)]`}>
              <stat.icon size={26} strokeWidth={2} />
            </div>
            <div>
              <div className={`text-3xl font-black leading-none mb-1 text-[var(--${stat.color}-700)]`}>{stat.value}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Calibration Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-900">Avaliações Consolidadas do Time</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--teal-50)] text-[var(--teal-600)] shadow-sm">
              2 Revisadas
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--amber-50)] text-[var(--amber-600)] shadow-sm">
              2 Pendentes
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Colaborador</th>
                <th className="p-4 text-center">Transform</th>
                <th className="p-4 text-center">Innovate</th>
                <th className="p-4 text-center">Collaborate</th>
                <th className="p-4 text-center">Geral</th>
                <th className="p-4 text-right pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-white" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{employee.name}</div>
                        <div className="text-xs text-slate-500">{employee.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--navy-50)] text-[var(--navy-700)] font-black text-sm border border-[var(--navy-100)]">
                      {employee.transform}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--coral-50)] text-[var(--coral-700)] font-black text-sm border border-[var(--coral-100)]">
                      {employee.innovate}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-50)] text-[var(--teal-700)] font-black text-sm border border-[var(--teal-100)]">
                      {employee.collaborate}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xl font-black text-slate-900 bg-slate-50 px-3 py-2 rounded-xl">
                      {employee.overall}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider ${employee.status === 'reviewed' ? 'bg-[var(--teal-50)] text-[var(--teal-600)]' : 'bg-[var(--amber-50)] text-[var(--amber-600)]'}`}>
                        {employee.status === 'reviewed' ? 'Revisado' : 'Pendente'}
                      </span>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:shadow-md hover:text-[var(--navy-500)] transition-all border border-transparent hover:border-slate-200 opacity-0 group-hover:opacity-100">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}