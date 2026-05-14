# Acompanhar Progresso de Respostas durante o PR

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador e o PDM acompanhem o progresso das respostas coletadas durante o ciclo de Performance Review, visualizando quantos avaliadores já responderam, status dos obrigatórios, prazo restante e etapas concluídas.

---

## Atores envolvidos

- **Colaborador:** acompanha o progresso do seu próprio PR
- **PDM:** acompanha o progresso do PR de cada um dos seus liderados

---

## Regras de negócio

- (Regra 20) Prazo do PR: 1 mês para concluir todas as etapas.
- (Regra 21) PR é avaliação 360: autoavaliação + pares + PDM.
- (Regra 23) Obrigatórios: autoavaliação e PDM. Quórum de pares varia por modelo.
- (Regra 15) Respostas individuais de pares são anônimas para o colaborador (mínimo 3 respondentes para exibição); progresso exibe contagem agregada.
- A tela exibe: respostas recebidas vs. total, status dos obrigatórios (self, PDM), número de pares que responderam, dias restantes e etapas pendentes do ciclo (validação de avaliadores, avaliações, submissão para calibração).
- O colaborador vê contagem agregada dos pares — sem identificação individual.
- O PR tem múltiplas etapas além da coleta (avaliação PDM, ajuste, submissão para calibração); a tela reflete o estado de cada etapa.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um PR ativo
Quando acessa a tela de acompanhamento do PR
Então visualiza o status de cada etapa: validação de avaliadores, coleta de respostas, avaliação PDM, calibração
E visualiza o prazo restante em dias (prazo de 1 mês)

Dado que o colaborador acessa o progresso do PR durante a fase de coleta
Quando verifica o status dos avaliadores
Então pode distinguir se a autoavaliação (self) foi submetida ou não
E visualiza quantos pares já responderam (contagem agregada, sem nomes)
E pode ver se a avaliação do PDM foi submetida ou não

Dado que o colaborador acessa o progresso do PR durante a fase de coleta
E a contagem de respondentes pares está abaixo do quórum mínimo para o modelo definido
Quando verifica o status
Então o sistema destaca a pendência indicando que o quórum mínimo ainda não foi atingido

Dado que um PDM autenticado acessa o progresso do PR de um liderado
Quando a tela é carregada
Então o PDM visualiza o mesmo painel de progresso com etapas e prazo

Dado que o prazo de 1 mês expirou
Quando o colaborador acessa a tela de progresso
Então o sistema exibe alerta de prazo expirado e o status atual de cada etapa pendente
```

---

## Quem pode acessar

- Colaborador autenticado: acessa o progresso do seu próprio PR ativo
- PDM autenticado: acessa o progresso do PR ativo de cada liderado direto

---

## Fora de escopo

- Acompanhamento de progresso do CF (tratado em `012`)
- Visualização do conteúdo das respostas antes da calibração (TBD — `description.md`)
- Reenvio de notificação individual para avaliadores pendentes (não previsto no MVP)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela               | Rota                | Propósito                                                     |
|--------------------|---------------------|---------------------------------------------------------------|
| Progresso do PR    | `/ciclos/pr/:id`    | Painel de progresso e etapas do ciclo PR ativo                |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos)
  └── [PR ativo] → /ciclos/pr/:id  ← tela de progresso
        ├── [ação: submeter autoavaliação pendente] → /ciclos/pr/:id/autoavaliacao (019)
        └── [ação: validar avaliadores pendente] → /ciclos/pr/:id/avaliadores (017)

/meu-time  ← para o PDM
  └── [card do liderado — PR ativo] → /meu-time/:colaboradorId/pr/:id
        ├── [ação: avaliar liderado] → /meu-time/:colaboradorId/pr/:id/avaliar (020)
        ├── [ação: ajustar score] → /meu-time/:colaboradorId/pr/:id/ajustar (021)
        └── [ação: submeter para calibração] → /meu-time/:colaboradorId/pr/:id/calibracao (022)
```

### Entrada na navegação

A tela de progresso do PR é acessada clicando no card do ciclo ativo em `/ciclos` (Colaborador) ou no card do liderado em `/meu-time` (PDM). Não há entrada nova no menu lateral — é uma sub-tela do ciclo PR específico.
