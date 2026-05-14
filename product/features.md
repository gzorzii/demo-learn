# Mapa de Features — POC Journey (Avaliação de Desempenho)

**Versão:** 2026-05-14
**Convenção de pasta:** `NNN.slug-em-pt-br` — numeração global sequencial, sem hierarquia de pastas.
Seções abaixo são agrupamentos lógicos por domínio; não representam módulos de pastas.

---

## Status de cada feature

| Status     | Significado                                              |
|------------|----------------------------------------------------------|
| [exists]   | Pasta com `business.md` já existe — será ignorada        |
| [new]      | Será criada                                              |
| [skipped]  | Já implementado no sistema; não requer `business.md`     |

---

## Decisões registradas

| # | Questão                                            | Decisão                                                                                     |
|---|----------------------------------------------------|---------------------------------------------------------------------------------------------|
| 1 | `iniciar-cf-automatico` vs `iniciar-cf-por-evento` | Mantidas **SEPARADAS** — gatilhos, pré-condições e regras de transição são distintos         |
| 2 | `responder-avaliacao-cf` (avaliador convidado)     | **Dentro do escopo do MVP** — feature mantida                                               |
| 3 | Nine Box preview no PR                             | Incorporado em `submeter-avaliacao-pdm-pr` — **não é feature isolada**                      |
| 4 | `criar-ciclo-admin` — segmentação + quarters       | Segmentação e distribuição nos quarters ficam **juntas** em um único `business.md`          |
| 5 | Features sem UI própria                            | `business.md` **sempre obrigatório**, mesmo para features exclusivamente de backend/sistema |

---

## 0. Infraestrutura

| NNN | Slug                        | Título                                              | Atores                              | Status    |
|-----|-----------------------------|-----------------------------------------------------|-------------------------------------|-----------|
| 001 | modelo-de-dados             | Modelo de dados do sistema (ER + glossário)         | Sistema                             | [exists]  |

---

## 1. Autenticação e Navegação

| NNN | Slug                        | Título                                              | Atores                              | Status    |
|-----|-----------------------------|-----------------------------------------------------|-------------------------------------|-----------|
| 002 | menu-navegacao              | Menu lateral e controle de acesso por perfil        | Todos                               | [new]     |

**Notas:**
- `001.login` já está implementado; nenhum arquivo será criado.
- `002.menu-navegacao` cobre a exibição dinâmica do menu conforme o(s) perfil(is) do usuário autenticado e a rota de entrada pós-login.

---

## 2. Visão Geral e Acompanhamento

| NNN | Slug                        | Título                                                          | Atores                              | Status |
|-----|-----------------------------|------------------------------------------------------------------|-------------------------------------|--------|
| 003 | visao-ciclos-ativos         | Visão CF + PR: acompanhar ciclos ativos do colaborador          | Colaborador, PDM                    | [new]  |

**Notas:**
- Tela "Sync / vista roxa": somente leitura; mostra ciclos CF e PR ativos da sujeita num único painel.
- Não é um terceiro tipo de ciclo — apenas agregação de leitura (regra 5).

---

## 3. Continuous Feedback (CF)

| NNN | Slug                              | Título                                                                   | Atores                              | Status |
|-----|-----------------------------------|--------------------------------------------------------------------------|-------------------------------------|--------|
| 004 | iniciar-cf-automatico             | Iniciar CF automático (trimestral e onboarding via cron)                 | Sistema (sem ator humano)           | [new]  |
| 005 | iniciar-cf-por-evento             | Iniciar CF por evento (mudança de projeto / promoção / cliente)          | Sistema (sem ator humano)           | [new]  |
| 006 | iniciar-cf-manual-pdm             | Iniciar CF manual pelo PDM para um liderado                              | PDM                                 | [new]  |
| 007 | iniciar-cf-manual-colaborador     | Iniciar CF manual pelo próprio colaborador                               | Colaborador                         | [new]  |
| 008 | validar-avaliadores-cf            | Validar e ajustar lista de avaliadores no CF                             | Colaborador, PDM                    | [new]  |
| 009 | responder-avaliacao-cf            | Responder avaliação como convidado no CF                                 | Avaliador convidado                 | [new]  |
| 010 | submeter-autoavaliacao-cf         | Submeter autoavaliação do colaborador no CF                              | Colaborador                         | [new]  |
| 011 | submeter-avaliacao-pdm-cf         | Submeter avaliação do PDM sobre o liderado no CF                         | PDM                                 | [new]  |
| 012 | acompanhar-progresso-cf           | Acompanhar progresso de respostas durante o CF                           | Colaborador, PDM                    | [new]  |
| 013 | encerrar-cf-manual                | Encerrar CF manual pela sujeita                                          | Colaborador                         | [new]  |
| 014 | visualizar-resumo-cf              | Visualizar resumo do ciclo CF encerrado                                  | Colaborador, PDM                    | [new]  |
| 015 | alerta-ia-cf                      | Alerta de IA para respostas insuficientes no CF                          | Colaborador, PDM, Avaliador convidado | [new]  |

**Notas:**
- `004` e `005` são features de sistema (sem ator humano direto no disparo); possuem `business.md` próprio conforme decisão 5. A tela do colaborador reflete o estado iniciado, não o disparo.
- `004` e `005` são mantidas **SEPARADAS** (decisão 1): `004` é acionada por cron em datas pré-definidas (trimestral + onboarding 30/90 dias); `005` é acionada por eventos de mudança no perfil do colaborador — pré-condições, gatilhos e regras de transição são distintos.
- `008` é separada para CF (regras de tempo: 7 dias, limite 10, ONA mock) — a de PR tem regras distintas.
- `009` está no escopo do MVP (decisão 2): avaliador convidado acessa e responde o formulário de avaliação CF.
- `015` cobre somente o alerta inline durante o preenchimento; pós-coleta (sumarização IA) está em `034`.

---

## 4. Performance Review (PR)

| NNN | Slug                              | Título                                                          | Atores                              | Status |
|-----|-----------------------------------|-----------------------------------------------------------------|-------------------------------------|--------|
| 016 | iniciar-pr-automatico             | Iniciar PR automático pelo sistema (pré-condições e blackout)   | Sistema (sem ator humano)           | [new]  |
| 017 | validar-avaliadores-pr            | Validar e ajustar lista de avaliadores no PR                    | Colaborador, PDM                    | [new]  |
| 018 | escolher-modelo-alocacao-pr       | PDM escolhe modelo de alocação do liderado (Team/StaffAug/SDLC) | PDM                                 | [new]  |
| 019 | submeter-autoavaliacao-pr         | Submeter autoavaliação nas 3 dimensões no PR                    | Colaborador                         | [new]  |
| 020 | submeter-avaliacao-pdm-pr         | PDM submete avaliação nas 3 dimensões + Nine Box preview        | PDM                                 | [new]  |
| 021 | ajustar-score-pdm-pr              | PDM ajusta score final (±1) com justificativa                   | PDM                                 | [new]  |
| 022 | submeter-para-calibracao          | PDM submete liderado para calibração                            | PDM                                 | [new]  |
| 023 | alerta-ia-pr                      | Alerta de IA para respostas insuficientes no PR                 | PDM                                 | [new]  |
| 024 | acompanhar-progresso-pr           | Acompanhar progresso de respostas durante o PR                  | Colaborador, PDM                    | [new]  |

**Notas:**
- `016` é feature de sistema (sem ator humano direto no disparo); possui `business.md` próprio conforme decisão 5.
- `017` é separada de `008`: quórum PR tem regras próprias (Team/StaffAug/SDLC, mínimo de pares, tenure).
- `020` inclui o Nine Box preview em tempo real — faz parte do mesmo fluxo de preenchimento do PDM (decisão 3); não é feature isolada.
- `021` é ação pontual e auditável (±1, justificativa obrigatória); separada do preenchimento principal `020`.
- `023` tem mesma natureza de `015` mas contexto PR; regras e dimensões avaliadas diferem.

---

## 5. Calibração

| NNN | Slug                              | Título                                                          | Atores                              | Status |
|-----|-----------------------------------|-----------------------------------------------------------------|-------------------------------------|--------|
| 025 | criar-ciclo-admin                 | Admin cria e configura ciclo (segmentação + quarters de PR)     | Admin                               | [new]  |
| 026 | gerar-agenda-calibracao           | Admin gera agenda da sessão de calibração                       | Admin                               | [new]  |
| 027 | prework-pdm-calibracao            | PDM escreve contexto/sumário do liderado antes da sessão        | PDM                                 | [new]  |
| 028 | conduzir-sessao-calibracao        | Calibrador conduz sessão: Nine Box, discussão e score final     | Calibrador, BP, PDM                 | [new]  |
| 029 | exportar-resultado-calibracao     | Calibrador exporta resultado pós-calibração                     | Calibrador                          | [new]  |

**Notas:**
- `025` unifica segmentação do ciclo + distribuição nos quarters (decisão 4): são etapas sequenciais do mesmo ato administrativo de criação de ciclo.

---

## 6. Devolutiva

| NNN | Slug                              | Título                                                          | Atores                              | Status |
|-----|-----------------------------------|-----------------------------------------------------------------|-------------------------------------|--------|
| 030 | registrar-devolutiva              | PDM registra devolutiva formal (status + data + comentário)     | PDM                                 | [new]  |

**Notas:**
- Devolutiva é registro formal da conversa conduzida pelo PDM após calibração; não é apenas notificação.

---

## 7. Resultados e Histórico

| NNN | Slug                              | Título                                                          | Atores                              | Status |
|-----|-----------------------------------|-----------------------------------------------------------------|-------------------------------------|--------|
| 031 | visualizar-relatorio-pr           | Colaborador visualiza relatório anual do PR (scores D1/D2/D3)  | Colaborador                         | [new]  |
| 032 | visualizar-historico-cf           | Colaborador visualiza histórico de CFs anteriores              | Colaborador                         | [new]  |
| 033 | download-relatorio-pdf            | Download do relatório em PDF                                    | Colaborador                         | [new]  |

---

## 8. IA — Pós-coleta

| NNN | Slug                              | Título                                                          | Atores                              | Status |
|-----|-----------------------------------|-----------------------------------------------------------------|-------------------------------------|--------|
| 034 | sumarizacao-ia-pos-coleta         | IA sumariza e analisa respostas após encerramento do ciclo      | Sistema (sem ator humano)           | [new]  |
| 035 | aprovar-resumo-ia                 | Avaliador aprova resumo gerado pela IA antes do registro        | PDM, Calibrador                     | [new]  |

**Notas:**
- `034` é feature de sistema (sem ator humano direto); possui `business.md` próprio conforme decisão 5.
- `034` abrange anonimização, sumarização e comparação com dimensões (regras 34 e 36).
- `035` é ação do avaliador: visualizar e aprovar (ou solicitar revisão) do resumo gerado; gate obrigatório (regra 35).

---

## Resumo

| Total identificado | [exists] | [skipped] | [new] |
|--------------------|----------|-----------|-------|
| 36                 | 1        | 1         | 34    |