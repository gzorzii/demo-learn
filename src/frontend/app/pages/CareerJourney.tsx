import { CheckCircle2, Target, BookOpen, AlertCircle, Star, Compass, MapPin, Users, HeartHandshake, ShieldCheck, TrendingUp } from "lucide-react";
import { useRole } from "../context/RoleContext";

export function CareerJourney() {
  const { isManager } = useRole();

  if (isManager) {
    return <ManagerCareerJourney />;
  }
  return <CollaboratorCareerJourney />;
}

function CollaboratorCareerJourney() {
  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#201E73] tracking-tight">Desenvolvimento e Carreira</h1>
          <p className="text-gray-500 mt-2">Acompanhe seu crescimento, maestria na função e planos de desenvolvimento contínuo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-1">
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          
          {/* Trilha Map */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#fd6e5e]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            
            <h2 className="text-2xl font-bold text-[#201E73] mb-8 flex items-center gap-2 relative z-10">
              <Compass className="text-[#fd6e5e]" /> Trilha de Desenvolvimento (Product)
            </h2>

            <div className="relative pl-6 sm:pl-10 pb-4">
              <div className="absolute left-[1.1rem] sm:left-[2.1rem] top-2 bottom-0 w-1 bg-gray-100 rounded-full"></div>
              <div className="absolute left-[1.1rem] sm:left-[2.1rem] top-2 h-[50%] w-1 bg-gradient-to-b from-[#201E73] to-[#fd6e5e] rounded-full"></div>

              <div className="space-y-10">
                <JourneyNode 
                  level="L3" 
                  title="Product Manager Mid" 
                  date="Ciclo Anterior" 
                  status="completed"
                  desc="Consolidação da capacidade de gerir backlog, alinhar stakeholders e entregar valor com autonomia."
                />
                <JourneyNode 
                  level="L4" 
                  title="Senior Product Manager" 
                  date="Nível Atual" 
                  status="current"
                  desc="Foco no domínio sobre a estratégia do produto, influência cross-squads e mentoria técnica."
                />
                <JourneyNode 
                  level="✨" 
                  title="Evolução Contínua" 
                  date="Foco Futuro" 
                  status="future"
                  desc="Busca por impacto organizacional, definição de visão de longo prazo e inovação sustentável."
                />
              </div>
            </div>
          </div>

          {/* Planos de Desenvolvimento (PDI) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#201E73] mb-6 flex items-center gap-2">
              <BookOpen className="text-[#fd6e5e]" /> Plano de Desenvolvimento Individual (PDI)
            </h2>

            <div className="space-y-4">
              <PdiCard 
                title="Mentoria de PMs Plenos" 
                progress={70} 
                deadline="Q3 2026" 
                tags={["Culture", "Liderança"]}
              />
              <PdiCard 
                title="Certificação em Product Strategy" 
                progress={40} 
                deadline="Q4 2026" 
                tags={["Tech", "Estratégia"]}
              />
            </div>
            
            <button className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 hover:text-[#201E73] hover:border-gray-300 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={20} /> Adicionar Nova Meta ao PDI
            </button>
          </div>
        </div>

        {/* Right Column: Skills & Strengths (NO 9-BOX) */}
        <div className="space-y-8 flex flex-col h-full">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-[#201E73] mb-2">Mapeamento de Competências</h2>
            <p className="text-sm text-gray-500 mb-6">Comparativo do seu momento atual vs. as expectativas para a sua senioridade atual (L4).</p>

            <div className="space-y-6">
              <GapMeter skill="Product Vision & Strategy" current={4} required={4} />
              <GapMeter skill="Stakeholder Management" current={4} required={4} />
              <GapMeter skill="Data-Driven & Analytics" current={3} required={4} />
              <GapMeter skill="Mentorship & Leadership" current={3} required={4} />
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="font-bold text-[#201E73] flex items-center gap-2 mb-2">
                <Target size={18} /> Foco Principal
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Para aumentar sua eficácia no nível atual, dedique-se ao desenvolvimento contínuo em <strong>Data-Driven</strong> e <strong>Leadership</strong>.
              </p>
            </div>
          </div>

          {/* Strengths Card (replaces 9-box for collaborator view) */}
          <div className="bg-[#fd6e5e] rounded-3xl shadow-lg p-8 text-white relative overflow-hidden flex-1 flex flex-col justify-center">
             <div className="absolute -bottom-6 -right-6 text-white/10">
                <HeartHandshake size={140} />
             </div>
             <div className="relative z-10">
               <h3 className="text-xl font-bold mb-2">Principais Fortalezas</h3>
               <p className="text-red-100 text-sm mb-6">Habilidades mais reconhecidas pelos seus pares no último ciclo.</p>
               
               <div className="space-y-3">
                 <div className="bg-white/10 rounded-xl p-3 border border-white/20 backdrop-blur-sm flex items-center gap-3">
                   <ShieldCheck className="text-white" size={24} />
                   <div>
                     <div className="font-bold text-white text-sm">Resolução de Conflitos</div>
                     <div className="text-xs text-red-100">Mencionado em 8 avaliações</div>
                   </div>
                 </div>
                 <div className="bg-white/10 rounded-xl p-3 border border-white/20 backdrop-blur-sm flex items-center gap-3">
                   <TrendingUp className="text-white" size={24} />
                   <div>
                     <div className="font-bold text-white text-sm">Foco em Resultados</div>
                     <div className="text-xs text-red-100">Alta consistência de entregas</div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerCareerJourney() {
  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#201E73] tracking-tight">Gestão de Carreira (Equipe)</h1>
          <p className="text-gray-500 mt-2">Visão gerencial do desenvolvimento, sucessão e performance dos seus liderados.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border border-blue-200">
          <Users size={18} />
          Visualizando Liderado: <span className="underline decoration-blue-300 underline-offset-2 cursor-pointer">Carlos Beta (L4)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-1">
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          
          {/* Trilha Map */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#fd6e5e]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            
            <h2 className="text-2xl font-bold text-[#201E73] mb-8 flex items-center gap-2 relative z-10">
              <Compass className="text-[#fd6e5e]" /> Mapa de Progressão (Engineering)
            </h2>

            <div className="relative pl-6 sm:pl-10 pb-4">
              <div className="absolute left-[1.1rem] sm:left-[2.1rem] top-2 bottom-0 w-1 bg-gray-100 rounded-full"></div>
              <div className="absolute left-[1.1rem] sm:left-[2.1rem] top-2 h-[50%] w-1 bg-gradient-to-b from-[#201E73] to-[#fd6e5e] rounded-full"></div>

              <div className="space-y-10">
                <JourneyNode 
                  level="L3" 
                  title="Software Engineer Mid" 
                  date="Atingido em Jan 2024" 
                  status="completed"
                  desc="Autonomia técnica na entrega de features e qualidade de código."
                />
                <JourneyNode 
                  level="L4" 
                  title="Senior Software Engineer" 
                  date="Nível Atual (Desde Jan 2025)" 
                  status="current"
                  desc="Domínio da arquitetura local, mentoria de pares e entregas de alta complexidade."
                />
                <JourneyNode 
                  level="L5" 
                  title="Principal Engineer / Tech Lead" 
                  date="Target Previsto: Q1 2027" 
                  status="future"
                  desc="Liderança técnica cross-squads, definições arquiteturais amplas e gestão de débitos críticos."
                />
              </div>
            </div>
          </div>

          {/* Planos de Desenvolvimento (PDI) */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#201E73] mb-6 flex items-center gap-2">
              <BookOpen className="text-[#fd6e5e]" /> Acompanhamento de PDI do Liderado
            </h2>

            <div className="space-y-4">
              <PdiCard 
                title="Liderar frente de Refatoração de Microsserviços" 
                progress={85} 
                deadline="Q3 2026" 
                tags={["Tech", "Arquitetura"]}
              />
              <PdiCard 
                title="Programa de Liderança Técnica" 
                progress={50} 
                deadline="Q4 2026" 
                tags={["Culture", "Mentoria"]}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Gap Analysis & 9-box (MANAGER ONLY) */}
        <div className="space-y-8 flex flex-col h-full">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-[#201E73] mb-2">Gap Analysis: Rumo ao L5</h2>
            <p className="text-sm text-gray-500 mb-6">Comparativo das competências atuais de Carlos vs. o esperado para promoção (L5).</p>

            <div className="space-y-6">
              <GapMeter skill="System Architecture" current={4} required={5} />
              <GapMeter skill="Code Quality" current={5} required={5} />
              <GapMeter skill="Technical Leadership" current={3} required={5} />
              <GapMeter skill="Business Impact" current={4} required={4} />
            </div>

            <div className="mt-8 p-4 bg-[#fd6e5e]/10 rounded-xl border border-[#fd6e5e]/20">
              <h4 className="font-bold text-[#fd6e5e] flex items-center gap-2 mb-2">
                <AlertCircle size={18} /> Ponto de Atenção (Líder)
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Para justificar o case de promoção para L5, Carlos precisa demonstrar maior protagonismo em <strong>Technical Leadership</strong> orientando desenvolvedores plenos.
              </p>
            </div>
          </div>

          <div className="bg-[#201E73] rounded-3xl shadow-lg p-8 text-white relative overflow-hidden flex-1 flex flex-col justify-center">
             <div className="absolute -bottom-10 -right-10 text-white/5">
                <Star size={160} />
             </div>
             <div className="relative z-10">
               <h3 className="text-xl font-bold mb-2">Talent Review & Sucessão</h3>
               <p className="text-blue-200 text-sm mb-6">Avaliação no Comitê de Calibração (Q1 2026).</p>
               
               <div className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm mb-4">
                 <div className="text-xs uppercase tracking-wider text-blue-200 font-bold mb-1">Posição na Matriz 9-Box</div>
                 <div className="text-2xl font-black text-white">Top Talent (Estrela)</div>
                 <div className="mt-2 text-sm text-blue-100 flex items-center gap-2">
                   Alta Performance + Alto Potencial
                 </div>
               </div>
               
               <div className="flex flex-wrap gap-2 text-xs font-bold">
                 <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">Risco de Saída: Baixo</span>
                 <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">Pronto p/ próximo nível: 1 ano</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JourneyNode({ level, title, date, status, desc }: any) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";
  
  return (
    <div className="relative z-10 flex gap-4 sm:gap-6">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm sm:text-base border-4 border-white shadow-sm ${
        isCompleted ? "bg-[#201E73] text-white" : 
        isCurrent ? "bg-[#fd6e5e] text-white ring-4 ring-[#fd6e5e]/20" : 
        "bg-gray-200 text-gray-500"
      }`}>
        {level}
      </div>
      
      <div className={`flex-1 p-5 rounded-2xl border transition-all ${
        isCurrent ? "bg-white border-[#fd6e5e]/30 shadow-md translate-x-1" : 
        isCompleted ? "bg-gray-50 border-gray-200 opacity-80" : 
        "bg-white border-dashed border-gray-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <h3 className={`text-lg font-bold ${isCurrent ? "text-[#fd6e5e]" : "text-[#201E73]"}`}>
            {title}
          </h3>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm w-fit">
            <MapPin size={12} /> {date}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PdiCard({ title, progress, deadline, tags }: any) {
  return (
    <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-[#201E73] text-[15px]">{title}</h4>
        <span className="text-xs font-bold text-gray-500 bg-gray-200/50 px-2 py-1 rounded-md">
          {deadline}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((t: string) => (
          <span key={t} className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-200 px-2 py-0.5 rounded">
            {t}
          </span>
        ))}
      </div>
      
      <div>
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-gray-500">Progresso</span>
          <span className="text-[#fd6e5e]">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div className="bg-[#fd6e5e] h-full rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

function GapMeter({ skill, current, required }: any) {
  const blocks = [1, 2, 3, 4, 5];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold text-gray-700">{skill}</span>
        <span className="text-xs font-semibold text-gray-400">Req: L{required}</span>
      </div>
      <div className="flex gap-1">
        {blocks.map(b => (
          <div 
            key={b} 
            className={`flex-1 h-2 rounded-full ${
              b <= current ? "bg-[#201E73]" : 
              b <= required ? "bg-gray-200 border border-dashed border-gray-300" : 
              "bg-gray-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
