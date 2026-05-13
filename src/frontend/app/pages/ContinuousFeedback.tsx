import { useState } from "react";
import { useRole } from "../context/RoleContext";
import { Plus, Send, Zap, MessageCircle, UserCheck, Search, CheckCircle2, Bot, Users, Award, ChevronRight } from "lucide-react";

export function ContinuousFeedback() {
  const { isManager } = useRole();
  const [activeView, setActiveView] = useState("request");

  const menuItems = [
    { id: "request", label: "Recomendações ONA", icon: Users, desc: "Sugestões de rede" },
    { id: "chat", label: "Feedbacks (Chat)", icon: MessageCircle, desc: "Coleta guiada por IA" },
    { id: "ai-insights", label: "Resumo Consolidado IA", icon: Award, desc: "Sintese do período" },
  ];

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#201E73]">Continuous Feedback</h1>
          <p className="text-gray-500 mt-2">Ágil, guiado por IA e integrado ao histórico anual.</p>
        </div>
        {!isManager && (
          <button className="bg-[#fd6e5e] hover:bg-[#e65c4c] text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors flex items-center gap-2">
            <Plus size={20} /> Solicitar Manualmente
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[600px]">
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-3">
          {menuItems.map((item) => {
            if (isManager && item.id === "request") return null;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-start text-left p-4 rounded-xl border transition-all duration-200 ${
                  isActive 
                    ? "border-[#fd6e5e] bg-[#fd6e5e]/10 shadow-sm" 
                    : "border-gray-200 bg-white hover:border-[#fd6e5e]/50 hover:bg-gray-50"
                }`}
              >
                <div className={`p-2 rounded-lg mr-4 ${isActive ? "bg-[#fd6e5e] text-white" : "bg-gray-100 text-gray-500"}`}>
                  <item.icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${isActive ? "text-[#201E73]" : "text-gray-700"}`}>{item.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
                {isActive && <ChevronRight size={18} className="text-[#fd6e5e] self-center" />}
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
          {activeView === "request" && !isManager && <RequestView />}
          {activeView === "chat" && <ChatView />}
          {activeView === "ai-insights" && <AIInsightsView isManager={isManager} />}
        </div>
      </div>
    </div>
  );
}

function RequestView() {
  const [selected, setSelected] = useState<string[]>([]);

  const recommendations = [
    { id: "1", name: "Ana Souza", role: "Product Manager", score: "98% Interação", tags: ["Squad Alpha", "Planning"] },
    { id: "2", name: "Carlos Beta", role: "Tech Lead", score: "92% Interação", tags: ["Code Review", "Mentoria"] },
    { id: "3", name: "Bruno Gamma", role: "QA Engineer", score: "85% Sincronia de Time", tags: ["Testes", "Release"] },
  ];

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else setSelected([...selected, id]);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#201E73] flex items-center gap-2">
            <Zap className="text-[#fd6e5e]" /> Topologia de Rede (ONA)
          </h2>
          <p className="text-gray-500 mt-2 max-w-lg">
            A IA analisou suas interações mais frequentes (repositórios, reuniões, slack) e sugere estas pessoas para um feedback 360º rico.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fd6e5e]/50"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 flex-1 content-start">
        {recommendations.map((peer) => (
          <div
            key={peer.id}
            onClick={() => toggleSelect(peer.id)}
            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 group ${
              selected.includes(peer.id)
                ? "border-[#fd6e5e] bg-[#fd6e5e]/5 shadow-md"
                : "border-gray-100 hover:border-[#fd6e5e]/30 hover:shadow-sm"
            }`}
          >
            {selected.includes(peer.id) && (
              <div className="absolute top-4 right-4 text-[#fd6e5e]">
                <CheckCircle2 size={24} fill="currentColor" className="text-white" />
              </div>
            )}
            
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-inner transition-colors ${
                selected.includes(peer.id) ? "bg-[#fd6e5e] text-white" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
              }`}>
                {peer.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{peer.name}</h3>
                <p className="text-sm text-gray-500 font-medium">{peer.role}</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {peer.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="w-full mt-2 pt-4 border-t border-gray-100">
                <span className="text-sm font-bold text-[#fd6e5e]">
                  {peer.score}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-6 mt-auto">
        <button 
          disabled={selected.length === 0}
          className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
            selected.length > 0 
              ? "bg-[#201E73] hover:bg-[#161453] text-white hover:-translate-y-1" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Send size={18} /> Solicitar Avaliação ({selected.length})
        </button>
      </div>
    </div>
  );
}

function ChatView() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Olá! Iniciamos a coleta de feedback para o Carlos Beta. Para começar, você poderia descrever brevemente a situação ou o projeto no qual vocês trabalharam juntos recentemente?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatStep, setChatStep] = useState("situation"); // situation, behavior, impact, closing

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", text: input }]);
    setInput("");
    setIsTyping(true);
    
    setTimeout(() => {
      let aiResponse = "";
      let nextStep = chatStep;
      
      const lowerInput = input.toLowerCase();

      if (chatStep === "situation") {
        if (lowerInput.length < 20) {
          aiResponse = "Parece um projeto interessante, mas para dar contexto ao Carlos, você poderia me dar um pouco mais de detalhes sobre qual era o desafio ou o contexto dessa situação?";
        } else {
          aiResponse = "Entendido. Agora, focando no *comportamento* do Carlos nessa situação: o que ele fez especificamente que chamou sua atenção? (ex: como ele agiu, quais decisões técnicas tomou, como colaborou com o time)";
          nextStep = "behavior";
        }
      } else if (chatStep === "behavior") {
        if (!lowerInput.includes("fez") && !lowerInput.includes("agiu") && !lowerInput.includes("decid") && !lowerInput.includes("ajudou") && !lowerInput.includes("criou")) {
          aiResponse = "Para evitar vieses, precisamos focar em ações observáveis. Tente descrever uma ação concreta que ele realizou em vez de apenas traços de personalidade. Como ele agiu na prática?";
        } else {
          aiResponse = "Ótimo, essas são evidências comportamentais muito boas! Para fechar o ciclo (Situação-Comportamento-Impacto), qual foi o *impacto* real dessas ações? Como isso afetou o resultado final do projeto, o cliente ou o próprio time?";
          nextStep = "impact";
        }
      } else if (chatStep === "impact") {
        if (!lowerInput.includes("reduz") && !lowerInput.includes("aument") && !lowerInput.includes("entreg") && !lowerInput.includes("melhor")) {
          aiResponse = "Pode quantificar ou detalhar um pouco mais esse impacto? Por exemplo, ganhamos tempo? A qualidade do código melhorou? O cliente ficou mais satisfeito?";
        } else {
          aiResponse = "Obrigado pelas evidências riquíssimas! Com base na sua descrição (Situação, Comportamento e Impacto), a IA mapeou fortes sinais nas competências de 'Results' e 'Tech'. Deseja revisar o rascunho final antes de enviar para o Carlos?";
          nextStep = "closing";
        }
      } else {
        aiResponse = "O rascunho foi salvo e consolidado com sucesso. Você pode acompanhá-lo no seu histórico. Obrigado por contribuir para o desenvolvimento contínuo da equipe!";
      }

      setMessages(prev => [...prev, { role: "ai", text: aiResponse }]);
      setChatStep(nextStep);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#201E73] flex items-center gap-2">
            <Bot className="text-[#fd6e5e]" /> Coleta Conversacional
          </h2>
          <p className="text-gray-500 text-sm mt-1">SLA 10 dias • Extração de evidências via IA</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Em andamento
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#F8F9FA] rounded-2xl p-6 mb-6 flex flex-col gap-6 shadow-inner border border-gray-100">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${
              msg.role === "user" ? "bg-[#201E73] text-white" : "bg-white text-[#fd6e5e] border-2 border-[#fd6e5e]/20"
            }`}>
              {msg.role === "user" ? <UserCheck size={20} /> : <Bot size={20} />}
            </div>
            <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
              msg.role === "user" 
                ? "bg-[#201E73] text-white rounded-tr-sm" 
                : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 max-w-[85%] self-start">
            <div className="w-10 h-10 rounded-full bg-white text-[#fd6e5e] border-2 border-[#fd6e5e]/20 flex items-center justify-center shrink-0 shadow-md">
              <Bot size={20} />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 rounded-tl-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
            </div>
          </div>
        )}
      </div>

      <div className="relative group">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Descreva a situação, comportamento e impacto..."
          className="w-full pl-6 pr-16 py-4 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-[#fd6e5e] focus:ring-4 focus:ring-[#fd6e5e]/10 transition-all text-gray-700 placeholder-gray-400"
        />
        <button 
          onClick={handleSend} 
          disabled={!input.trim()}
          className={`absolute right-3 top-3 p-2 rounded-xl transition-all ${
            input.trim() 
              ? "bg-[#fd6e5e] text-white hover:bg-[#e65c4c] shadow-md hover:-translate-y-0.5" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
        </button>
      </div>
    </div>
  );
}

function AIInsightsView({ isManager }: { isManager: boolean }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#fd6e5e]/10 rounded-2xl text-[#fd6e5e]">
            <Award size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#201E73]">Síntese Contínua</h2>
            <p className="text-gray-500 mt-1">Análise semântica de todos os feedbacks recebidos no ciclo.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 content-start">
        <InsightCard 
          title="Results" 
          score="Supera (Exceeds)"
          color="text-[#fd6e5e]"
          bg="bg-[#fd6e5e]/10"
          border="border-[#fd6e5e]/20"
          desc="A IA nota um padrão recorrente de superação de metas nas sprints e resolução proativa de problemas de negócio."
        />
        <InsightCard 
          title="Tech" 
          score="Atende (Meets)"
          color="text-[#201E73]"
          bg="bg-[#201E73]/10"
          border="border-[#201E73]/20"
          desc="Base sólida. Múltiplos pares elogiaram a qualidade do código, embora o design de arquitetura ainda seja um ponto de desenvolvimento."
        />
        <InsightCard 
          title="Culture" 
          score="Supera (Exceeds)"
          color="text-[#201E73]"
          bg="bg-[#201E73]/10"
          border="border-[#201E73]/20"
          desc="Forte alinhamento com valores ágeis. Excelente trabalho em equipe mencionado em 85% das evidências extraídas."
        />
      </div>

      {isManager && (
        <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#201E73]/5 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <h3 className="font-bold text-[#201E73] text-lg mb-3 flex items-center gap-2">
              <UserCheck size={22} className="text-[#fd6e5e]" /> Perspectiva para o PDM
            </h3>
            <p className="text-gray-700 leading-relaxed text-[15px]">
              Este resumo consolidado servirá como base fundamental para a Performance Review da Ana. A IA <strong className="text-[#201E73]">tensionou as evidências cruas</strong> para reduzir vieses (como o de recência ou de afinidade), garantindo que a projeção reflita objetivamente o nível de senioridade esperado na trilha de carreira.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({ title, score, color, bg, border, desc }: any) {
  return (
    <div className={`p-6 rounded-2xl border ${border} bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col h-full`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <div className={`px-3 py-1 rounded-lg font-bold text-sm ${bg} ${color}`}>
          {score}
        </div>
      </div>
      <p className="text-[15px] text-gray-600 leading-relaxed flex-1">{desc}</p>
      
      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confiança IA</span>
        <div className="flex gap-1">
          <div className="w-8 h-1.5 rounded-full bg-green-500"></div>
          <div className="w-8 h-1.5 rounded-full bg-green-500"></div>
          <div className="w-8 h-1.5 rounded-full bg-green-500"></div>
        </div>
      </div>
    </div>
  );
}
