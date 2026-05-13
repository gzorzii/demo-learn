import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, TrendingUp, Lightbulb, Users, ArrowUpRight, ArrowDownRight, Sparkles, Filter, Search } from 'lucide-react';

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'pending'>('received');
  const navigate = useNavigate();

  const vectorStats = [
    {
      name: 'Transform',
      icon: TrendingUp,
      color: 'navy',
      score: 4.2,
      change: +0.3,
      totalFeedbacks: 12,
    },
    {
      name: 'Innovate',
      icon: Lightbulb,
      color: 'coral',
      score: 3.8,
      change: -0.1,
      totalFeedbacks: 10,
    },
    {
      name: 'Collaborate',
      icon: 'teal',
      iconComponent: Users,
      color: 'teal',
      score: 4.5,
      change: +0.2,
      totalFeedbacks: 15,
    },
  ];

  const receivedFeedbacks = [
    {
      from: 'Carlos Mendes',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
      role: 'Tech Lead',
      vector: 'Transform',
      vectorColor: 'navy',
      score: 5,
      comment: 'Excelente trabalho na refatoração do módulo de autenticação. A qualidade do código e a abordagem sistemática foram exemplares.',
      date: '2 mai 2026',
    },
    {
      from: 'Marina Costa',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
      role: 'Product Designer',
      vector: 'Collaborate',
      vectorColor: 'teal',
      score: 4,
      comment: 'Sempre colaborativa e disposta a compartilhar conhecimento. A parceria no projeto de acessibilidade foi fundamental.',
      date: '30 abr 2026',
    },
    {
      from: 'Bruno Alves',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
      role: 'Senior Developer',
      vector: 'Innovate',
      vectorColor: 'coral',
      score: 4,
      comment: 'Ótima aplicação de novas abordagens nas revisões de código. Demonstra uso crítico e consciente das ferramentas.',
      date: '28 abr 2026',
    },
  ];

  const pendingFeedbacks = [
    {
      to: 'João Silva',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=faces',
      role: 'Backend Developer',
      vectors: ['Transform', 'Innovate'],
      requestedDate: '1 mai 2026',
      daysLeft: 10,
    },
    {
      to: 'Fernanda Lima',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
      role: 'UX Designer',
      vectors: ['Collaborate'],
      requestedDate: '29 abr 2026',
      daysLeft: 3,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Feedback 360°
          </h1>
          <p className="text-slate-500 font-medium">
            Ciclo Q2 2025 • Acompanhe as avaliações recebidas e suas pendências
          </p>
        </div>
        <button className="px-6 py-3 rounded-xl flex items-center justify-center gap-2 bg-[var(--coral-500)] text-white font-bold shadow-[0_4px_14px_rgba(255,90,54,0.4)] hover:-translate-y-0.5 transition-transform w-full sm:w-auto shrink-0">
          <Plus size={20} strokeWidth={3} />
          Solicitar Feedback
        </button>
      </div>

      {/* Vector Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vectorStats.map((vector) => (
          <div key={vector.name} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150`} style={{ backgroundColor: `var(--${vector.color}-500)` }} />
            
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--${vector.color}-100)] text-[var(--${vector.color}-600)]`}>
                {vector.name === 'Collaborate' ? <Users size={24} strokeWidth={2} /> : <vector.icon size={24} strokeWidth={2} />}
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${vector.change > 0 ? 'bg-[var(--teal-50)] text-[var(--teal-600)]' : 'bg-[var(--coral-50)] text-[var(--coral-600)]'}`}>
                {vector.change > 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                {vector.change > 0 ? '+' : ''}{vector.change}
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-slate-500 font-bold mb-1">{vector.name}</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-4xl font-black text-[var(--${vector.color}-600)]`}>
                  {vector.score}
                </span>
                <span className="text-slate-400 font-bold">/ 5.0</span>
              </div>
              <p className="text-sm font-medium text-slate-400">
                Baseado em {vector.totalFeedbacks} avaliações
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Tabs & Filters */}
        <div className="border-b border-slate-100 px-6 sm:px-8 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-2">
            {[
              { key: 'received', label: 'Recebidos', count: 37 },
              { key: 'sent', label: 'Enviados', count: 24 },
              { key: 'pending', label: 'Pendentes', count: 2 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`relative pb-4 whitespace-nowrap font-bold transition-colors ${activeTab === tab.key ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${activeTab === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--coral-500)] rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pb-6 md:pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--navy-300)] focus:ring-2 focus:ring-[var(--navy-100)] w-full md:w-48 transition-all" />
            </div>
            <button className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 bg-slate-50/50 min-h-[400px]">
          {activeTab === 'received' && (
            <div className="grid gap-4">
              {receivedFeedbacks.map((feedback, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <img src={feedback.avatar} alt={feedback.from} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                      <div>
                        <h4 className="font-bold text-slate-900">{feedback.from}</h4>
                        <p className="text-sm text-slate-500">{feedback.role}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold bg-[var(--${feedback.vectorColor}-50)] text-[var(--${feedback.vectorColor}-600)]`}>
                        {feedback.vector}
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-black leading-none text-[var(--${feedback.vectorColor}-600)]`}>{feedback.score} <span className="text-sm text-slate-400 font-bold">/ 5</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 font-medium leading-relaxed mb-4">
                    "{feedback.comment}"
                  </p>
                  
                  <div className="flex justify-end border-t border-slate-50 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{feedback.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="grid gap-4">
              {pendingFeedbacks.map((feedback, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[var(--coral-200)] transition-colors group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${feedback.daysLeft < 7 ? 'bg-[var(--coral-500)]' : 'bg-[var(--amber-500)]'}`} />
                  
                  <div className="flex items-center gap-4">
                    <img src={feedback.avatar} alt={feedback.to} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">Avaliar {feedback.to}</h4>
                      <p className="text-sm text-slate-500 mb-3">{feedback.role}</p>
                      <div className="flex flex-wrap gap-2">
                        {feedback.vectors.map((vector) => (
                          <span key={vector} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">
                            {vector}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                    <div className="text-center md:text-right">
                      <div className={`text-xl font-black mb-1 ${feedback.daysLeft < 7 ? 'text-[var(--coral-600)]' : 'text-[var(--amber-600)]'}`}>
                        {feedback.daysLeft} dias restantes
                      </div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Solicitado em {feedback.requestedDate}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/feedback/chat')}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl flex items-center justify-center gap-2 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-transform hover:scale-105"
                    >
                      <Sparkles size={18} className="text-[var(--coral-400)]" />
                      Avaliar com IA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">24 avaliações enviadas</h3>
              <p className="text-slate-500 font-medium max-w-sm">Você contribuiu bastante neste ciclo! Seus feedbacks enviados aparecerão aqui após o fechamento do trimestre.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}