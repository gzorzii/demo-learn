# CI&T Performance System — Stitch AI Prompt
# Produto: Sistema de Gestão de Performance para CI&T (8.000+ funcionários)
# Output esperado: protótipo navegável multi-tela, pronto para apresentação

PRODUTO: CI&T Perform
EMPRESA: CI&T — Software global com +8.000 colaboradores
OBJETIVO: Sistema de gestão de performance com dois pilares:
  (1) Continuous Feedback 360° (CF) — cadência trimestral
  (2) Performance Review (PR) — cadência anual

AUDIÊNCIA PRIMÁRIA:
  → CI&Ter (colaborador — visão padrão)
  → PDM (People Development Manager / lead direto)
  → Guest (avaliador convidado — acesso restrito ao formulário de avaliação)

TIPOGRAFIA:
  Font família: DM Sans (única família — sem serifa)
  Pesos usados: 400 (body), 500 (labels/UI), 700 (headings)
  Tamanhos: 28px h1 · 20px h2 · 16px h3 · 14px body · 12px caption · 10px overline

PALETA DE CORES — expandida, acessível (WCAG AA):

  Navy (primária):
    --navy-900: #0D1E4A  --navy-700: #1B3585  --navy-500: #2858D9
    --navy-300: #87A8F5  --navy-100: #DBE8FF  --navy-50:  #F0F5FF

  Coral (ação / urgência):
    --coral-600: #BA3A1C  --coral-500: #E8593C  --coral-300: #F59A82
    --coral-100: #FEF0EC

  Teal (sucesso / positivo):
    --teal-600: #0A7A59  --teal-500: #0FA47A  --teal-300: #5CC9A7
    --teal-100: #E3F5EF

  Amber (atenção / em progresso):
    --amber-500: #E8A020  --amber-300: #F5C870  --amber-100: #FFF4E3

  Lavanda (neutro informativo / guest):
    --lavender-500: #7B6FE0  --lavender-300: #ADA4EE  --lavender-100: #F0EEFF

  Neutros:
    --gray-900: #0F172A  --gray-700: #334155  --gray-500: #64748B
    --gray-300: #CBD5E1  --gray-200: #E2E8F0  --gray-100: #F1F5F9  --gray-50: #F8FAFC

REGRAS DE CONTRASTE (WCAG AA mínimo):
  → Texto sobre fundo claro: navy-700+ ou gray-700+
  → Texto sobre fundo navy-900/800: branco ou navy-100
  → Badges coloridos: sempre usar par fill-100 + text-600 da mesma família
  → Ratio mínimo 4.5:1 para texto 14px, 3:1 para texto 18px+

ESTILO VISUAL:
  Raio de borda: 8px componentes · 14px cards · 20px modal/surface grande
  Sombra: 0 1px 3px rgba(0,0,0,0.08) cards · 0 4px 16px rgba(0,0,0,0.12) elevados
  Espaçamento base: 4px grid · escala 4/8/12/16/24/32/48px
  Estilo: Flat, clean, elegante. Zero gradientes decorativos. Sem glassmorphism.
  Ícones: Linha fina 1.5–1.8px stroke. Estilo: Lucide ou Phosphor outline.

LAYOUT GERAL:
  Sidebar esquerda 64px (ícones) → expande para 220px no hover (labels visíveis)
  Header fixo 56px → saudação + badge do ciclo ativo + notificações + avatar
  Conteúdo principal scroll vertical

SIDEBAR — itens de navegação (ordem):
  ① Home          → visão geral do CI&Ter
  ② Feedback 360°  → Continuous Feedback (CF)
  ③ Performance    → Performance Review (PR)
  ④ Resultados     → output da avaliação e histórico
  ⑤ Calibração     → visível apenas para PDM
  —— divisor ——
  ⑥ Configurações
  Rodapé: Avatar + nome + toggle "Mudar para visão PDM"

AVISO DE PENDÊNCIA (Pending Assessments):
  → Badge numérico coral no ícone da sidebar (ex: "2")
  → Banner de alerta suave no topo do conteúdo (não-intrusivo) quando há pendências:
      "Você tem 2 avaliações pendentes · Prazo: 22 mai → [Completar agora]"
  → Cards de pendência destacados na Home com borda coral-500 esquerda
  → Ícone de relógio + contador de dias restantes em vermelho quando < 7 dias

TELA: Home — visão do CI&Ter (tela padrão de entrada)

SEÇÃO 1 — Header personalizado:
  "Olá, [Nome]! 👋" (DM Sans 28px, sem serifa)
  Subtítulo: data atual + ciclo ativo em badge navy-50

SEÇÃO 2 — Card de ciclo ativo (full width, bg navy-900):
  → Nome do ciclo + fase atual destacada
  → Timeline horizontal com 5 fases:
       [✓ Metas] → [✓ Check-in] → [● Autoavaliação] → [○ PDM] → [○ Calibração]
  → Barra de progresso coral com % de conclusão
  → Contador de dias restantes (número grande, coral-300) no canto direito
  → CTA primário: "Completar autoavaliação →"

SEÇÃO 3 — Grid 2 colunas (55% / 45%):
  Col. esquerda — Pendências e ações:
  → Lista de action items priorizados (urgente / normal / sugerido)
  → Cada item: ícone colorido + título + subtítulo + badge de prazo
  → Pendências com borda esquerda coral-500 e badge "Urgente"

  Col. direita — Meu desempenho (radar chart):
  → Spider/radar chart SVG com 3 eixos (vetores):
       - Vetor 1: Entrega Real (Transform)
       - Vetor 2: Como aplica o que sabe (Innovate)
       - Vetor 3: Comportamentos (Collaborate)
  → Nota geral centralizada no radar (ex: "4.1")
  → Tags de score por vetor abaixo do radar

SEÇÃO 4 — Feedbacks recentes (full width):
  → 3 cards horizontais: avatar + nome + trecho do feedback + badge tipo + data
  → Tipos: Positivo (teal) · Desenvolvimento (lavanda) · Solicitado (amber)

TELA: Continuous Feedback 360° — cadência trimestral

CONCEITO DE IA PARA SELEÇÃO DE AVALIADORES:
  → IA analisa topologia de times e padrões de interação (ONA concept)
  → Sugere avaliadores automaticamente com chip "Sugerido por IA 🤖"
  → CI&Ter pode confirmar, remover ou adicionar avaliadores manualmente
  → Mínimo: 3 avaliadores · Máximo: 8 · PDM sempre incluído

ESTADO 1 — Dashboard CF (lista de feedbacks do trimestre):
  → Header: "Feedback 360° · Q2 2025"
  → Tabs: [Recebidos] [Enviados] [Pendentes]
  → Cards por vetor com score atual e variação vs trimestre anterior
  → Botão primário: "+ Solicitar feedback"
  → Lista de feedbacks com filtro por vetor e por período

ESTADO 2 — Solicitar feedback (modal ou página):
  → Passo 1: Seleção de avaliadores (chips com sugestão de IA)
  → Passo 2: Escolher vetores a serem avaliados (checkboxes com descrição)
  → Passo 3: Prazo + mensagem personalizada opcional
  → CTA: "Enviar solicitação"

ESTADO 3 — Formulário de resposta de feedback (visão Guest/Avaliador):
  → Interface de CHAT com IA que guia o avaliador por perguntas conversacionais
  → IA faz perguntas por vetor, valida a resposta e converte em rating estruturado
  → Não é formulário frio — é uma conversa guiada
  → Progresso visível: "Vetor 1 de 3 · Entrega Real"
  → Ao final: resumo gerado pela IA + confirmação antes de enviar

OS 3 VETORES — detalhe para UI dos formulários e cards:

  VETOR 1 — Entrega Real (Transform) ícone: ⬆ ou foguete · cor: navy
  Personas: PDM + CI&Ter
  Pergunta base: "O que essa pessoa entregou? Qual a qualidade e relevância?"
  Subcampos:
    • O que entregou (progressos e bloqueios)
    • Qualidade e relevância da entrega

  VETOR 2 — Como aplica o que sabe (Innovate) ícone: 💡 ou neurônio · cor: lavanda
  Personas: PDM + CI&Ter + Guests
  Pergunta base: "Como essa pessoa aplica conhecimento nas entregas? Usa IA com critério?"
  Subcampos:
    • Conhecimentos adquiridos e como foram aplicados
    • Uso crítico de IA e novas tecnologias (identifica quando aplicar, revisa outputs)

  VETOR 3 — Comportamentos (Collaborate) ícone: 🤝 ou pessoas · cor: teal
  Personas: PDM + CI&Ter + Guests
  Pergunta base: "Quais comportamentos dessa pessoa elevam o time?"
  Subcampos:
    • Constrói relações de confiança, cumpre combinados
    • Trata pessoas com respeito, compartilha conhecimento
    • Presença e suporte ao time

TELA: Performance Review — cadência anual

# Mesmos 3 vetores do CF, mas com profundidade e formalidade maiores
# Processo mais estruturado · inputs de múltiplos avaliadores · culmina em calibração

FLUXO COMO CI&TER (autoavaliação):
  → Tela de abertura: resumo do que foi avaliado nos últimos 12 meses (CF histórico)
  → 3 seções, uma por vetor, com campos texto + rating por subcritério
  → IA sugere rascunhos baseados nos feedbacks do ano
  → Indicador de progresso no topo: "Seção 2 de 3 · Como aplica o que sabe"
  → Ao final: tela de revisão antes de submeter

FLUXO COMO PDM (avaliação do liderado — FOCO PRINCIPAL):
  → Lista de liderados com status por cor:
       verde (completo) · amber (em progresso) · coral (não iniciado/urgente)
  → Ao abrir um liderado:
       - Header com nome, cargo, time, foto/avatar
       - Tabs: [Minha avaliação] [Autoavaliação deles] [Feedbacks recebidos]
       - Formulário guiado por vetor com campos de justificativa obrigatória
       - IA sugere texto de justificativa baseado nos feedbacks coletados
       - Rating por vetor: escala 1–5 com âncoras comportamentais descritivas
  → Sidebar direita: histórico de CF do colaborador (linha do tempo)

FLUXO COMO GUEST (avaliador convidado — ONA):
  → Acesso via link único (sem login completo)
  → Chat IA interativo: guia o Guest com perguntas conversacionais por vetor
  → IA captura contexto, valida coerência e gera rating estruturado automaticamente
  → Guest revisa o resumo gerado antes de confirmar
  → UX simples, zero fricção — deve funcionar como uma conversa natural

TELA DE CALIBRAÇÃO (visão PDM — tela separada):
  → Integração com Google Calendar (eventos de fórum de calibração visíveis)
  → Prework checklist para o PDM antes do fórum
  → Tabela de colaboradores com ratings preliminares lado a lado
  → Possibilidade de editar rating com justificativa no contexto do fórum
  → Status do fórum: data, participantes, pauta, ata pós-calibração

TELA: Resultados & Output — como a avaliação é disponibilizada

COMPONENTES OBRIGATÓRIOS:
  → Score geral com nome do ciclo e data de publicação
  → Radar chart dos 3 vetores (Transform / Innovate / Collaborate)
  → Breakdown por vetor: score + justificativa do PDM + principais feedbacks recebidos
  → Comparativo com ciclo anterior (seta ↑↓ com %) se disponível
  → Plano de desenvolvimento sugerido pela IA (3 ações concretas por vetor)
  → Histórico de ciclos (linha do tempo com scores)
  → Seção de reação: CI&Ter pode comentar o resultado e PDM responde

MOCKUP: Chat interativo com IA para Avaliador Guest

INTERFACE:
  → Layout de chat (estilo WhatsApp/Slack — bolhas de conversa)
  → Lado esquerdo: mensagens da IA (avatar "CI&T Assist" · bg navy-50)
  → Lado direito: respostas do avaliador (bg coral-100)
  → Input de texto na base + botão enviar
  → Progresso: "Avaliando Vetor 2 de 3 · Innovate" (barra no topo)

FLUXO CONVERSACIONAL DA IA (exemplo — Vetor 3):
  IA: "Olá! Vou te ajudar a avaliar [Nome]. Tem cerca de 5 minutos?"
  IA: "Pense em situações concretas do último trimestre. Em algum momento [Nome]
       ajudou alguém do time ou compartilhou conhecimento de forma relevante?"
  Avaliador: [resposta livre]
  IA: "Que ótimo exemplo! Você diria que esse comportamento é consistente
       ou aconteceu pontualmente?"
  IA: "Baseado no que você me contou, aqui está o resumo que vou registrar:
       [resumo gerado] — posso ajustar algo?"

APÓS O CHAT:
  → Tela de revisão: resumo por vetor gerado pela IA
  → Rating numérico sugerido pela IA por vetor (editável pelo avaliador)
  → CTA: "Confirmar e enviar avaliação"
  → Mensagem de encerramento: "Obrigado! Sua avaliação foi enviada com sucesso."

INSTRUÇÕES DE PROTOTIPAÇÃO:

TELAS A GERAR (prioridade):
  1. Home — CI&Ter (tela principal · entrada do sistema)
  2. Continuous Feedback 360° — Dashboard (lista + solicitação)
  3. Chat IA — Avaliador Guest (mockup do chat conversacional)
  4. Performance Review — Avaliação PDM (foco principal)
  5. Resultados & Output (radar + breakdown + histórico)
  6. Calibração + Google Calendar (tela separada · visão PDM)

LINKS DE NAVEGAÇÃO OBRIGATÓRIOS:
  → Home → Feedback 360° → Chat Guest → Voltar
  → Home → Performance Review (PDM) → Calibração
  → Sidebar sempre visível e funcional em todas as telas
  → Toggle "Visão CI&Ter ↔ Visão PDM" no rodapé da sidebar

ESTADOS DE INTERFACE OBRIGATÓRIOS:
  → Estado com pendências (banner coral + badge numérico na sidebar)
  → Estado sem pendências (interface limpa)
  → Formulário PDM: estado vazio · em progresso · completo
  → Chat IA: 3 mensagens mínimas por fluxo (abertura · pergunta · resumo)

TOM DE VOZ DA INTERFACE:
  "Humano, direto e encorajador. Sem jargão corporativo pesado.
  A IA deve soar como um colega prestativo, não como um sistema burocrático."

DISPOSITIVO ALVO: Desktop (1440px) · Responsivo para 1280px
DENSIDADE: Confortável (não comprimida). Espaço em branco generoso.
GRID: 12 colunas · gutter 24px · margin lateral 48px

