---
name: design
description: >-
  Refines Team Talent Hub UI in TeamManagement.tsx per brand layout rules.
  Use when the user invokes /design or asks to redo Team Talent header, KPI
  cards, Pessoas do time bar, pending highlights, or replacing “sinais” with
  “evidências”.
disable-model-invocation: true
---

# Team Talent Hub — layout & copy (`/design`)

When applying this skill to `src/app/pages/TeamManagement.tsx`, follow these instructions **verbatim**:

refaça o cabeçalho do team talent. Retire o icone do lado, a linha vermelha abaixo, a tag de Performance Review · "janela aberta" mude para available com um pin de location.

os cards de:  
Liderados 5
Avaliação habilitada 3
Evidencias de feedback (média) 12
deixe-os  mais visualmente bonitos, amigáveis. Modifique o verde pois nao está contrastando com o fundo branco.

no card com o título Pessoas do time, coloque uma cor mais soft, está conflitando com o baner do cabeçalho. Adicione uma bolinha vermelha nas pessoas que tem pendencia como hightlight. Sempre que tiver a palavra "sinais" subsitua para evidencias.

## Brand reminders

- Navy: `#201E73`; coral accent: `#fd6e5e` (per `.cursorrules`).
- Prefer `rounded-2xl` on main surfaces; semantic greens use dark text on soft backgrounds for WCAG.
