import { useState } from "react";
import { useRole } from "../context/RoleContext";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Brain, FileText, Save, Award, Activity, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

export function PerformanceReview() {
  const { isManager } = useRole();
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, title: "Visão Analítica (IA)", icon: Brain, desc: "Padrões longitudinais" },
    { id: 2, title: "Autoavaliação", icon: FileText, desc: "Reflexão guiada" },
    ...(isManager ? [{ id: 3, title: "Decisão do PDM", icon: Award, desc: "Outcome e devolutiva" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[#201E73] tracking-tight">Performance Review</h1>
        <p className="text-gray-500 mt-3 text-lg">Avaliação anual baseada em evidências, alinhamento e projeção de impacto.</p>
      </div>

      {/* Stepper Navigation */}
      <div className="mb-12 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full hidden md:block"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-4 md:gap-0">
          {steps.map((step, index) => {
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-4 p-4 md:p-0 md:bg-transparent rounded-2xl md:rounded-none transition-all duration-300 relative group ${
                  isActive ? "bg-white shadow-md md:shadow-none border border-[#fd6e5e]/20 md:border-transparent" : "hover:bg-white/50"
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 z-10 transition-all ${
                  isActive 
                    ? "bg-[#fd6e5e] border-white text-white shadow-lg scale-110" 
                    : isCompleted
                      ? "bg-white border-[#fd6e5e] text-[#fd6e5e]"
                      : "bg-white border-gray-200 text-gray-400 group-hover:border-[#fd6e5e]/50"
                }`}>
                  {isCompleted ? <CheckCircle2 size={24} /> : <step.icon size={isActive ? 28 : 24} />}
                </div>
                <div className="text-left md:absolute md:top-16 md:left-1/2 md:-translate-x-1/2 md:w-32 md:text-center mt-0 md:mt-2">
                  <h3 className={`font-bold text-[15px] ${isActive ? "text-[#201E73]" : "text-gray-600"}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 hidden md:block mt-1">{step.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 p-8 md:p-12 min-h-[500px]">
        {activeStep === 1 && <OverviewStep onNext={() => setActiveStep(2)} />}
        {activeStep === 2 && <SelfEvaluationStep isManager={isManager} onNext={() => isManager ? setActiveStep(3) : {}} />}
        {activeStep === 3 && isManager && <PDMReviewStep />}
      </div>
    </div>
  );
}

function OverviewStep({ onNext }: { onNext: () => void }) {
  const data = [
    { id: '1', subject: 'Results', self: 80, pdm: 90, fullMark: 100 },
    { id: '2', subject: 'Tech', self: 75, pdm: 70, fullMark: 100 },
    { id: '3', subject: 'Culture', self: 90, pdm: 95, fullMark: 100 },
    { id: '4', subject: 'Leadership', self: 60, pdm: 65, fullMark: 100 },
    { id: '5', subject: 'Innovation', self: 85, pdm: 80, fullMark: 100 },
  ];

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#fd6e5e]/10 text-[#fd6e5e] rounded-full text-sm font-bold mb-6">
            <Brain size={16} /> Análise Preditiva
          </div>
          <h2 className="text-3xl font-bold text-[#201E73] mb-6 leading-tight">
            Convergência de Feedback
          </h2>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">
            A IA analisou todo o Continuous Feedback do ciclo cruzando com o nível de senioridade esperado. As evidências ancoram uma performance excepcional em <strong className="text-[#201E73]">Cultura</strong> e <strong className="text-[#201E73]">Resultados</strong>.
          </p>

          <div className="bg-[#201E73]/5 border-l-4 border-[#fd6e5e] p-6 rounded-r-2xl mb-10">
            <h3 className="font-bold text-[#201E73] text-lg flex items-center gap-3">
              <Activity className="text-[#fd6e5e]" /> Outcome Projetado: <span className="text-[#fd6e5e] bg-white px-3 py-1 rounded-lg shadow-sm">Supera (Exceeds)</span>
            </h3>
            <p className="text-gray-600 mt-3 text-[15px] leading-relaxed">A probabilidade estatística de manutenção deste nível no próximo semestre é de 87% caso as metas de Tech sejam desenvolvidas.</p>
          </div>

          <button onClick={onNext} className="w-full sm:w-auto bg-[#201E73] hover:bg-[#161453] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
            Prosseguir para Autoavaliação <ChevronRight size={20} />
          </button>
        </div>

        <div className="order-1 lg:order-2 bg-gray-50 rounded-3xl p-6 h-[400px] flex flex-col">
          <h3 className="text-center font-bold text-gray-500 mb-2 text-sm tracking-widest uppercase">Radar de Competências</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                <PolarGrid key="grid" stroke="#cbd5e1" strokeDasharray="3 3" />
                <PolarAngleAxis key="angle" dataKey="subject" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} />
                <PolarRadiusAxis key="radius" angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar key="self" name="Self" dataKey="self" stroke="#e65c4c" strokeWidth={2} fill="#fd6e5e" fillOpacity={0.3} />
                <Radar key="pdm" name="PDM" dataKey="pdm" stroke="#201E73" strokeWidth={2} fill="#201E73" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
            
            {/* Legend inside chart area */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <div className="w-3 h-3 rounded-full bg-[#fd6e5e]"></div> Self
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <div className="w-3 h-3 rounded-full bg-[#201E73]"></div> PDM / 360
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelfEvaluationStep({ isManager, onNext }: { isManager: boolean, onNext: () => void }) {
  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-[#201E73]">Reflexão e Autoavaliação</h2>
        <p className="text-gray-500 mt-2">Momento para a Ana destacar sua percepção sobre o ciclo.</p>
      </div>

      <div className="space-y-8">
        {[
          { 
            id: "q1",
            title: "Quais foram suas principais entregas e como impactaram os resultados (Results)?", 
            val: "Liderei a migração de microsserviços que reduziu a latência em 40%. Consegui manter as entregas da sprint mesmo durante a reestruturação da guilda.",
            hint: "Dica: Tente quantificar o impacto sempre que possível."
          },
          { 
            id: "q2",
            title: "Onde você acredita que precisa se desenvolver para o próximo nível?", 
            val: "Quero me aprofundar em System Design e ter mais oportunidades para atuar na mentoria técnica de pessoas menos seniores do time.",
            hint: "Dica: Conecte seu desenvolvimento com as trilhas da empresa."
          }
        ].map((q, i) => (
          <div key={q.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <label className="block font-bold text-[#201E73] mb-2 text-lg">{q.title}</label>
            {!isManager && <p className="text-xs text-[#fd6e5e] mb-4 flex items-center gap-1"><AlertCircle size={14} /> {q.hint}</p>}
            <textarea
              readOnly={isManager}
              className={`w-full p-5 border-2 rounded-xl h-40 text-[15px] leading-relaxed transition-all resize-none ${
                isManager 
                  ? 'bg-white border-gray-200 text-gray-700 cursor-default' 
                  : 'bg-white border-gray-200 focus:border-[#fd6e5e] focus:ring-4 focus:ring-[#fd6e5e]/10 outline-none text-gray-800'
              }`}
              defaultValue={q.val}
              placeholder="Escreva sua resposta detalhada aqui..."
            ></textarea>
          </div>
        ))}
        
        <div className="flex justify-end pt-6">
          {!isManager ? (
            <button className="bg-[#fd6e5e] hover:bg-[#e65c4c] text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5 flex items-center gap-3 text-lg">
              <Save size={22} /> Enviar Avaliação
            </button>
          ) : (
            <button onClick={onNext} className="bg-[#201E73] hover:bg-[#161453] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              Prosseguir para Decisão <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PDMReviewStep() {
  const categories = ["Abaixo", "Em desenvolvimento", "Atende", "Supera"];
  const [selected, setSelected] = useState(3); // Default Supera

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-[#201E73]">Review Final PDM</h2>
        <p className="text-gray-500 mt-2">Determine o conceito ancorado nas evidências e defina os próximos passos.</p>
      </div>

      {/* Outcome Selection */}
      <div className="mb-12">
        <h3 className="font-bold text-gray-800 text-lg mb-4">Outcome do Ciclo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <div
              key={`category-btn-${i}`}
              onClick={() => setSelected(i)}
              className={`p-5 rounded-2xl border-2 text-center cursor-pointer transition-all duration-300 transform ${
                selected === i
                  ? "border-[#fd6e5e] bg-[#fd6e5e] shadow-lg scale-105"
                  : "border-gray-200 bg-white hover:border-[#fd6e5e]/50 hover:bg-gray-50"
              }`}
            >
              <span className={`font-bold text-base block ${selected === i ? 'text-white' : 'text-gray-600'}`}>
                {cat}
              </span>
              {selected === i && (
                <div className="mt-2 text-white/80 text-xs font-medium uppercase tracking-wider">
                  Selecionado
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feedforward and Goals */}
      <div className="bg-gradient-to-b from-[#201E73]/5 to-transparent border border-[#201E73]/10 p-8 rounded-3xl mb-10">
        <h3 className="font-bold text-[#201E73] text-xl mb-2 flex items-center gap-3">
          <Award className="text-[#fd6e5e]" size={26} /> Plano de Ação (Próximo Ciclo)
        </h3>
        <p className="text-[15px] text-gray-600 mb-6">
          Formalize a devolutiva final e os OKRs/Metas firmados com a Ana Maria.
        </p>
        <textarea
          className="w-full p-5 border-2 border-white bg-white/60 focus:bg-white rounded-2xl h-48 text-[15px] leading-relaxed transition-all resize-none shadow-inner focus:border-[#fd6e5e] focus:ring-4 focus:ring-[#fd6e5e]/10 outline-none"
          placeholder="Ex: 1. Assumir a frente de arquitetura no projeto principal. 2. Mentoriar ativamente 2 devs júniores..."
        ></textarea>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
        <button className="px-8 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-lg">
          Salvar Rascunho
        </button>
        <button className="bg-[#201E73] hover:bg-[#161453] text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-[#201E73]/20 transition-transform hover:-translate-y-1 text-lg flex items-center justify-center gap-2">
          Confirmar e Publicar Outcome <CheckCircle2 size={22} />
        </button>
      </div>
    </div>
  );
}