import { useState } from 'react';
import { TrendingUp, Lightbulb, Users, Sparkles, Save, CheckCircle2, Circle, AlertCircle, ChevronRight, User, Edit3 } from 'lucide-react';

interface PerformanceReviewPageProps {
  viewMode: 'CITer' | 'PDM';
}

export default function PerformanceReviewPage({ viewMode }: PerformanceReviewPageProps) {
  const [activeTab, setActiveTab] = useState<'my-eval' | 'self-eval' | 'feedbacks'>('my-eval');
  const [selectedEmployee, setSelectedEmployee] = useState('João Silva');

  const employees = [
    { name: 'João Silva', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=faces', role: 'Backend Developer', status: 'complete', statusColor: 'teal' },
    { name: 'Maria Santos', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces', role: 'Frontend Developer', status: 'in-progress', statusColor: 'amber' },
    { name: 'Pedro Costa', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces', role: 'DevOps Engineer', status: 'pending', statusColor: 'coral' },
    { name: 'Ana Paula', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces', role: 'QA Analyst', status: 'complete', statusColor: 'teal' },
  ];

  const vectors = [
    {
      name: 'Entrega Real',
      subtitle: 'Transform',
      icon: TrendingUp,
      color: 'navy',
      description: 'O que essa pessoa entregou? Qual a qualidade e relevância do impacto técnico?',
      rating: 4,
    },
    {
      name: 'Aplicação Prática',
      subtitle: 'Innovate',
      icon: Lightbulb,
      color: 'coral',
      description: 'Como essa pessoa aplica conhecimento nas entregas? Utiliza IA de forma crítica?',
      rating: 4,
    },
    {
      name: 'Comportamentos',
      subtitle: 'Collaborate',
      icon: Users,
      color: 'amber',
      description: 'Quais comportamentos dessa pessoa ajudam a elevar a moral e o desempenho do time?',
      rating: 5,
    },
  ];

  if (viewMode === 'CITer') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Performance Review</h1>
          <p className="text-slate-500 font-medium">Sua avaliação anual de ciclo (Q2 2025)</p>
        </div>

        <div className="bg-white rounded-3xl p-10 sm:p-16 text-center shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-[var(--coral-50)] rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={40} className="text-[var(--coral-500)]" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Ainda não é hora!</h3>
          <p className="text-slate-500 text-lg max-w-md mx-auto mb-8">A fase de autoavaliação será aberta em 15 de Junho de 2026. Aproveite para solicitar e responder feedbacks no momento.</p>
          <button className="px-8 py-3 rounded-xl font-bold text-base text-white bg-[var(--navy-500)] hover:bg-[var(--navy-700)] transition-colors shadow-md">
            Ir para Feedbacks 360°
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Avaliação do Time</h1>
          <p className="text-slate-500 text-sm">Ciclo Q2 2025 • Preencha as avaliações dos seus liderados</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <div className="text-sm font-medium text-slate-600">Progresso Geral:</div>
          <div className="font-bold text-[var(--navy-500)]">50%</div>
          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden ml-2">
            <div className="h-full bg-[var(--navy-500)] w-1/2 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar - Team List */}
        <div className="lg:col-span-3 flex flex-col gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-2 px-2">Seus Liderados</h2>
          {employees.map((employee) => (
            <button
              key={employee.name}
              onClick={() => setSelectedEmployee(employee.name)}
              className={`p-3 rounded-2xl text-left transition-all border ${
                selectedEmployee === employee.name 
                  ? 'bg-[var(--navy-50)] border-[var(--navy-100)]' 
                  : 'bg-transparent border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-white" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{employee.name}</div>
                  <div className="text-xs text-slate-500 truncate">{employee.role}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 px-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  employee.status === 'complete' ? 'text-[var(--teal-600)]' : 
                  employee.status === 'in-progress' ? 'text-[var(--amber-600)]' : 'text-[var(--coral-600)]'
                }`}>
                  {employee.status === 'complete' ? 'Concluído' : employee.status === 'in-progress' ? 'Em Rascunho' : 'Pendente'}
                </span>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: `var(--${employee.statusColor}-500)`,
                      width: employee.status === 'complete' ? '100%' : employee.status === 'in-progress' ? '50%' : '0%',
                    }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Employee Header Redesigned */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <img src={employees.find(e => e.name === selectedEmployee)?.avatar} alt={selectedEmployee} className="w-20 h-20 rounded-full object-cover shadow-sm border-2 border-white ring-4 ring-slate-50" />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedEmployee}</h2>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--amber-50)] text-[var(--amber-600)] flex items-center gap-1">
                    <Edit3 size={12} />
                    Rascunho
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium">{employees.find(e => e.name === selectedEmployee)?.role} • Time Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Média Atual</div>
                <div className="text-3xl font-black text-[var(--navy-500)] leading-none">4.2<span className="text-base text-slate-400 font-bold">/5</span></div>
              </div>
            </div>
          </div>

          {/* Fluid Tabs */}
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            {[
              { key: 'my-eval', label: 'Sua Avaliação', icon: Target },
              { key: 'self-eval', label: 'Autoavaliação (João)', icon: User },
              { key: 'feedbacks', label: 'Feedbacks 360°', icon: Users },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.key 
                    ? 'bg-[var(--navy-500)] text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Evaluation Form */}
          {activeTab === 'my-eval' && (
            <div className="space-y-6 pb-20">
              {vectors.map((vector, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
                  
                  {/* Vector Header */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[var(--${vector.color}-100)] text-[var(--${vector.color}-600)]`}>
                      <vector.icon size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className={`text-xs font-black uppercase tracking-widest text-[var(--${vector.color}-600)] mb-1`}>{vector.subtitle}</div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{vector.name}</h3>
                      <p className="text-sm font-medium text-slate-500">{vector.description}</p>
                    </div>
                  </div>

                  {/* Rating Scale - More fluid and interactive */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <div className="flex gap-2 sm:gap-4">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          className={`flex-1 py-4 rounded-xl text-xl font-bold transition-all ${
                            vector.rating === rating 
                              ? `bg-[var(--${vector.color}-500)] text-white shadow-lg scale-105` 
                              : 'bg-white text-slate-400 hover:bg-white hover:shadow-sm hover:text-slate-600'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-400 mt-3 px-2">
                      <span>Abaixo do esperado</span>
                      <span>Supera expectativas</span>
                    </div>
                  </div>

                  {/* AI Suggestion */}
                  <div className="bg-[var(--navy-50)] rounded-2xl p-5 flex gap-4 border border-[var(--navy-100)]">
                    <div className="mt-0.5 shrink-0 text-[var(--navy-500)]"><Sparkles size={20} /></div>
                    <div>
                      <div className="text-sm font-bold text-[var(--navy-800)] mb-1">Resumo de I.A. baseado no 360°</div>
                      <p className="text-sm text-[var(--navy-900)] opacity-80 font-medium leading-relaxed">
                        "João demonstra excelente domínio técnico e qualidade consistente nas entregas. Destacam-se as implementações de arquitetura de microserviços e otimização de performance. Recomendado avaliar entre 4 e 5."
                      </p>
                    </div>
                  </div>

                  {/* Justification */}
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      Justificativa <span className="text-[var(--coral-500)]">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descreva exemplos concretos e comportamentos observados..."
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-[var(--navy-300)] focus:ring-4 focus:ring-[var(--navy-50)] transition-all resize-y"
                      defaultValue="João teve entregas excepcionais neste ciclo. Liderou a migração da arquitetura monolítica para microserviços, resultando em melhoria de 40% na performance. Demonstra profundo conhecimento técnico e capacidade de traduzir requisitos complexos em soluções elegantes."
                    />
                  </div>
                </div>
              ))}

              {/* Floating Action Bar */}
              <div className="fixed bottom-6 left-1/2 lg:left-[calc(50%+100px)] -translate-x-1/2 bg-slate-900 rounded-2xl shadow-xl p-2 flex gap-2 z-50">
                <button className="px-6 py-3 rounded-xl font-bold text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2">
                  <Save size={18} />
                  Salvar Rascunho
                </button>
                <button className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-[var(--coral-500)] hover:bg-[var(--coral-600)] transition-colors shadow-sm">
                  Finalizar Avaliação
                </button>
              </div>
            </div>
          )}

          {activeTab === 'self-eval' && (
             <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center">
             <div className="w-16 h-16 bg-[var(--navy-50)] rounded-full flex items-center justify-center mb-4">
               <User size={24} className="text-[var(--navy-400)]" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">Autoavaliação Pendente</h3>
             <p className="text-slate-500 max-w-sm mx-auto">João ainda não finalizou a sua autoavaliação neste ciclo.</p>
           </div>
          )}

          {activeTab === 'feedbacks' && (
             <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center">
             <div className="w-16 h-16 bg-[var(--amber-50)] rounded-full flex items-center justify-center mb-4">
               <Users size={24} className="text-[var(--amber-500)]" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">Feedbacks 360°</h3>
             <p className="text-slate-500 max-w-sm mx-auto mb-6">João recebeu 12 feedbacks no último ciclo.</p>
             <button className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-[var(--navy-500)] hover:bg-[var(--navy-700)] transition-colors">
               Ver todos os Feedbacks
             </button>
           </div>
          )}
        </div>
      </div>
    </div>
  );
}