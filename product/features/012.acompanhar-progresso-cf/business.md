# Acompanhar Progresso de Respostas durante o CF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador e o PDM acompanhem em tempo real o progresso das respostas coletadas durante o ciclo de CF, sabendo quantos avaliadores já responderam, quantos estão pendentes e quantos dias restam para encerramento.

---

## Atores envolvidos

- **Colaborador:** acompanha o progresso do seu próprio CF
- **PDM:** acompanha o progresso do CF de cada um dos seus liderados

---

## Regras de negócio

- (Regra 11) Avaliadores têm 10 dias para responder após o início da coleta.
- (Regra 12) Encerramento automático: após 10 dias de coleta ou 100% das respostas obrigatórias.
- (Regra 9) Obrigatórios: self e PDM; convidados são opcionais.
- (Regra 15) Respostas individuais de convidados são anônimas para o colaborador (mínimo 3 respondentes para exibição); o progresso mostra contagem agregada, não identidades individuais.
- A tela exibe: número de respostas recebidas vs. total de avaliadores, status dos obrigatórios (self, PDM) e prazo restante em dias.
- Nomes de convidados que responderam ou não responderam não são exibidos individualmente ao colaborador — apenas contagem.
- O PDM pode ver o progresso individual por avaliador (a confirmar: visibilidade de nomes para o PDM).

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um CF ativo na fase de coleta
Quando acessa a tela de acompanhamento de progresso
Então visualiza o total de avaliadores, quantos já responderam e quantos dias restam

Dado que o colaborador acessa o progresso do CF
Quando verifica o status dos avaliadores obrigatórios
Então pode distinguir se a autoavaliação (self) e a avaliação do PDM foram submetidas ou não

Dado que o colaborador acessa o progresso do CF
Quando verifica os convidados
Então visualiza apenas a contagem agregada (X de Y convidados responderam) — sem identificação individual

Dado que todos os avaliadores obrigatórios responderam e 100% das respostas foram coletadas
Quando o sistema verifica o estado do ciclo
Então o encerramento automático é disparado
E o colaborador é notificado do encerramento

Dado que um PDM autenticado acessa o progresso do CF de um liderado
Quando a tela é carregada
Então o PDM visualiza o mesmo painel de progresso (total, respondidos, prazo restante)
```

---

## Quem pode acessar

- Colaborador autenticado: acessa o progresso do seu próprio CF ativo
- PDM autenticado: acessa o progresso do CF ativo de cada liderado direto

---

## Fora de escopo

- Acompanhamento de progresso do PR (tratado em `024`)
- Visualização do conteúdo das respostas durante a coleta (disponível apenas após encerramento, em `014`)
- Reenvio de notificação individual para avaliadores pendentes (não previsto no MVP)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                  | Rota                    | Propósito                                               |
|-----------------------|-------------------------|---------------------------------------------------------|
| Progresso do CF       | `/ciclos/cf/:id`        | Painel de progresso de respostas do ciclo CF ativo      |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos)
  └── [CF ativo — fase: coleta] → /ciclos/cf/:id  ← tela de progresso
        ├── [ação: submeter autoavaliação pendente] → /ciclos/cf/:id/autoavaliacao (010)
        └── [ação: encerrar CF manual] → (013.encerrar-cf-manual) — somente CF manual

/meu-time  ← para o PDM
  └── [card do liderado — CF ativo] → /meu-time/:colaboradorId/cf/:id
        └── [ação: submeter avaliação PDM pendente] → /meu-time/:colaboradorId/cf/:id/avaliar (011)
```

### Entrada na navegação

A tela de progresso do CF é acessada clicando no card do ciclo ativo em `/ciclos` (Colaborador) ou no card do liderado em `/meu-time` (PDM). Ambas as rotas levam à visão de progresso do ciclo CF específico.

---

## Questões em aberto

- O PDM pode ver o nome individual de cada convidado que respondeu ou não, ou apenas a contagem agregada (igual ao colaborador)?
- A visibilidade definida como "TBD" no flows.md (notas por pilar e texto 360 antes da calibração) impacta o que o colaborador vê nesta tela?
