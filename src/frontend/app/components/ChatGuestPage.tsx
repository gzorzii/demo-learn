import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Send, ArrowLeft, Sparkles, Check, ChevronRight } from 'lucide-react';

export default function ChatGuestPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Olá! Vou te ajudar a avaliar João Silva. Tem cerca de 5 minutos?',
      timestamp: '14:32',
    },
    {
      role: 'ai',
      content: 'Vamos começar pelo primeiro vetor: **Comportamentos (Collaborate)**. Pense em situações concretas do último trimestre. Em algum momento João ajudou alguém do time ou compartilhou conhecimento de forma relevante?',
      timestamp: '14:32',
    },
    {
      role: 'user',
      content: 'Sim! O João organizou uma sessão de pair programming comigo quando eu estava com dificuldade em um problema de performance. Ele foi muito paciente e didático.',
      timestamp: '14:35',
    },
    {
      role: 'ai',
      content: 'Que ótimo exemplo! Você diria que esse comportamento de apoio e compartilhamento de conhecimento é consistente ou aconteceu pontualmente?',
      timestamp: '14:35',
    },
    {
      role: 'user',
      content: 'É bem consistente. Ele sempre está disponível para ajudar o time e costuma compartilhar artigos e recursos úteis no Slack.',
      timestamp: '14:37',
    },
    {
      role: 'ai',
      content: 'Perfeito! Baseado no que você me contou, aqui está o resumo que vou registrar para o vetor Comportamentos:\n\n> "João demonstra comportamento colaborativo consistente. Organiza sessões de pair programming para apoiar colegas com dificuldades, sendo paciente e didático. Mantém postura proativa de compartilhamento de conhecimento através de recursos e artigos relevantes no Slack. Sempre disponível para ajudar o time."\n\nPosso ajustar algo neste resumo?',
      timestamp: '14:37',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [vectorProgress, setVectorProgress] = useState({
    current: 1,
    total: 3,
    name: 'Collaborate',
  });

  const handleSend = () => {
    if (!inputValue.trim()) return;

    setMessages([
      ...messages,
      {
        role: 'user',
        content: inputValue,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputValue('');
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 z-10 shadow-sm relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--coral-500)] rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/feedback')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Sparkles size={24} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 leading-tight">Assistente 360°</h2>
              <p className="text-xs font-bold text-slate-400">Powered by CI&T AI</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="hidden md:flex flex-col items-end min-w-[200px]">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vetor {vectorProgress.current}/{vectorProgress.total} • {vectorProgress.name}
            </span>
            <span className="text-xs font-black text-indigo-600">
              {Math.round((vectorProgress.current / vectorProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${(vectorProgress.current / vectorProgress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Evaluating Card Context */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-slate-200/60 shadow-sm mx-auto max-w-fit mb-8 sticky top-0 z-20">
              <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=faces" alt="João" className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100" />
              <div className="pr-4">
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Avaliando: João Silva</h3>
                <p className="text-xs font-medium text-slate-500">Backend Developer</p>
              </div>
            </div>

            {/* Messages */}
            {messages.map((message, idx) => (
              <div key={idx} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-3 max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  
                  {message.role === 'ai' ? (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles size={14} className="text-indigo-600" />
                    </div>
                  ) : (
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces" alt="You" className="w-8 h-8 rounded-full object-cover border border-white shadow-sm shrink-0" />
                  )}

                  <div className="flex flex-col gap-1 min-w-0">
                    <div
                      className={`px-5 py-4 rounded-2xl shadow-sm text-[15px] font-medium leading-relaxed ${
                        message.role === 'ai' 
                          ? 'bg-white text-slate-700 border border-slate-100 rounded-bl-none' 
                          : 'bg-slate-900 text-white rounded-br-none'
                      }`}
                      style={{
                        whiteSpace: 'pre-wrap',
                      }}
                      dangerouslySetInnerHTML={{ __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-200 pl-4 py-1 my-2 bg-indigo-50/50 rounded-r-lg text-indigo-900 font-medium">$1</blockquote>') }}
                    />
                    <span className={`text-[10px] font-bold text-slate-400 px-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Action Buttons Example (Usually would conditionally render) */}
            <div className="flex flex-wrap gap-3 justify-center pt-6">
              <button className="px-6 py-2.5 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors">
                Gostaria de ajustar algo
              </button>
              <button className="px-6 py-2.5 rounded-full bg-[var(--teal-500)] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,179,131,0.3)] hover:-translate-y-0.5 transition-transform flex items-center gap-2">
                <Check size={16} strokeWidth={3} />
                Está perfeito, continuar
              </button>
            </div>
            
            <div className="h-4" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-100 p-4 sm:p-6 shrink-0 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 transition-all p-2 flex items-end gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua resposta de forma natural..."
              rows={1}
              className="w-full max-h-32 px-3 py-2 bg-transparent text-slate-700 text-[15px] font-medium focus:outline-none resize-none custom-scrollbar"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: inputValue.trim() ? 'var(--coral-500)' : 'var(--slate-800)',
              boxShadow: inputValue.trim() ? '0 4px 14px rgba(255,90,54,0.4)' : 'none'
            }}
          >
            <Send size={20} strokeWidth={2.5} className={inputValue.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
          </button>
        </div>
        <div className="max-w-3xl mx-auto mt-2 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Enter para enviar • Shift + Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}