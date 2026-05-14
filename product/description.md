# POC Journey — Avaliação de Desempenho

**Version:** 2026-05-14
**Status:** Under Refinement

> Para regras de negócio, ver `business-rules.md`.
> Para jornadas por perfil, ver `flows.md`.

---

## Objetivo

Substituir processos frágeis (planilhas, e-mail) por uma plataforma centralizada e auditável de avaliação de desempenho de colaboradores da CI&T. O sistema combina **Continuous Feedback** (cadência trimestral, por evento ou manual) e **Performance Review** (anual por grupo), com calibração no sistema e IA para garantir qualidade das respostas.

**Performance (manifesto CI&T):** gerar resultado que importa pro negócio, pro cliente, com o time, com consistência — e aprender mais rápido do que o mundo muda.

---

## Atores e perfis

As permissões de sistema são controladas pelo enum `Permission` (`CIETER`, `PDM`, `CALIBRATOR`, `BP`, `ADMIN`). Um usuário pode acumular múltiplas permissões.

- **CIETER (Colaborador CI&T):** sujeita da avaliação; realiza autoavaliação; indica/valida avaliadores (CF e PR); recebe resumos e relatório final. Acessa apenas Meus Ciclos.
- **PDM (People Development Manager):** avalia liderados nas 3 dimensões; ajusta score (±1); submete para calibração; conduz devolutiva. Acessa Meus Ciclos e My Team.
- **CALIBRATOR (Calibrador):** decisão final de scores na sessão de calibração; substitui planilha; normalmente executivo ou BP da área. Acessa tela de Calibração.
- **BP (Business Partner):** participa da calibração; visão agregada e tendências. Acessa tela de Calibração. Pode acumular o papel de Admin.
- **ADMIN:** cria e configura ciclos (segmentados por role, região, senioridade); distribui colaboradores nos quarters de PR; gera sessões e agenda de calibração. Acessa todas as telas. Papel independente — pode ser acumulado por BP.

---

## Restrições e premissas

- Âmbito inicial: **Brasil**, grupo piloto; expansão para outros papéis e regiões fora do MVP.
- **8.000 colaboradores** — divisão em 4 grupos para viabilizar escala do PR.
- **LGPD:** anonimização obrigatória; políticas de retenção e acesso a definir com jurídico antes do lançamento.
- Contexto pré-existente disponível no sistema: login, nome, cargo, role, senioridade, PDM, data de admissão, alocações (C-LOB), JD, skills, mudanças de papel, PDI, férias/afastamentos.
- Dados gerados/coletados: respostas longas, scores 1–4, histórico CF, listas de indicados, ajustes PDM (auditoria), decisões de calibração, PDFs em storage.
- **Visibilidade de notas por pilar e texto 360 antes da calibração:** TBD — aguardando decisão de stakeholder.
- Google Chat **não** é canal de coleta no MVP; apenas notificações.
- Toda funcionalidade deve ter política de acesso explicitamente definida; funcionalidade sem política declarada = falha crítica de segurança.

---

## Fora do escopo do produto (MVP)

- **Gestão de metas:** definição e acompanhamento de metas individuais ou coletivas
- **PDI:** módulo dedicado a planos de desenvolvimento individual
- **Rewards / reconhecimento:** promoções, bônus, PLR e remuneração variável
- **ONA real:** integração com e-mail, Calendar e Google Chat — fase 2
- **Google Chat como canal de coleta:** notificações apenas; coleta via chat embutido
- **Gravação de áudio + transcrição:** desejável, não bloqueante no MVP
- Expansão para todos os papéis e regiões além do grupo piloto Brasil