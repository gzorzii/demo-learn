# Visualizar Resumo do Ciclo CF Encerrado

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir ao colaborador e ao PDM o resumo consolidado de um ciclo de Continuous Feedback após seu encerramento, apresentando as respostas coletadas (respeitando anonimização) e o sumário gerado pela IA para facilitar a leitura e reflexão.

---

## Atores envolvidos

- **Colaborador:** visualiza o resumo do seu próprio CF encerrado
- **PDM:** visualiza o resumo do CF encerrado de cada liderado, incluindo respostas na íntegra (a confirmar escopo de visibilidade)

---

## Regras de negócio

- (Regra 15) Anonimização: mínimo de 3 respondentes para exibição de respostas em feedbacks pontuais; se houver menos de 3, respostas individuais de convidados não são exibidas de forma identificável.
- (Regra 34) IA pós-coleta: anonimização, sumarização e comparação com critérios das dimensões; histórico de até ~24 meses.
- (Regra 35) Resumo gerado pela IA deve ter aprovação do avaliador antes do registro oficial (tratado em `035`).
- (Regra 3) Autoavaliação não conta para nota final; é exibida no resumo para contexto.
- O resumo exibe: avaliação do PDM, autoavaliação da sujeita, sumário das respostas dos convidados (anônimas), e sumário gerado pela IA (quando aprovado — regra 35).
- O colaborador vê as respostas individuais dos convidados sem identificação do autor (anônimas), desde que haja ≥ 3 respondentes (Regra 15). Se houver menos de 3, as respostas não são exibidas individualmente — apenas mensagem informativa.
- O PDM vê as respostas individuais dos convidados na íntegra: nome do convidado e texto completo de cada resposta.
- O ciclo deve estar encerrado para que o resumo seja acessível.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um CF encerrado
Quando acessa o resumo do ciclo
Então visualiza a avaliação do PDM (texto completo)
E visualiza sua própria autoavaliação
E visualiza o sumário de respostas dos convidados (respeitando anonimização)

Dado que o CF encerrado teve menos de 3 convidados respondentes
Quando o colaborador acessa o resumo
Então as respostas individuais dos convidados não são exibidas de forma identificável
E uma mensagem informa que o número mínimo de respondentes não foi atingido para exibição individualizada

Dado que o resumo gerado pela IA foi aprovado (feature 035)
Quando o colaborador acessa o resumo
Então o sumário de IA aparece destacado na tela

Dado que o resumo da IA ainda não foi aprovado
Quando o colaborador acessa o resumo
Então o sumário de IA não é exibido (ou aparece como "em processamento")

Dado que um PDM autenticado acessa o resumo do CF encerrado de um liderado
Quando a tela é carregada
Então o PDM visualiza o mesmo resumo que o colaborador vê
E (a confirmar) pode visualizar respostas individuais dos convidados na íntegra

Dado que um ciclo de CF ainda está ativo
Quando o colaborador tenta acessar o resumo
Então o sistema informa que o ciclo ainda não foi encerrado
```

---

## Quem pode acessar

- Colaborador autenticado: visualiza o resumo do seu próprio CF encerrado
- PDM autenticado: visualiza o resumo do CF encerrado de cada liderado direto

---

## Fora de escopo

- Acompanhamento de progresso durante a coleta (tratado em `012`)
- Edição do resumo pelo colaborador ou PDM
- Relatório formal do PR (tratado em `031`)
- Histórico de todos os CFs anteriores (tratado em `032`)
- Aprovação do resumo de IA (tratada em `035`)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela           | Rota                       | Propósito                                                   |
|----------------|----------------------------|-------------------------------------------------------------|
| Resumo do CF   | `/ciclos/cf/:id/resumo`    | Visualização consolidada de um ciclo CF encerrado           |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos) — exibe CFs encerrados recentes como cards
  └── [CF encerrado] → /ciclos/cf/:id/resumo  ← tela de resumo
        └── [voltar] → /ciclos

/ciclos/cf/:id  (012.acompanhar-progresso-cf)
  └── [ciclo encerrado automaticamente] → redireciona para /ciclos/cf/:id/resumo

/ciclos/cf/:id  (013.encerrar-cf-manual)
  └── [encerramento manual confirmado] → redireciona para /ciclos/cf/:id/resumo

/meu-time  ← para o PDM
  └── [card do liderado — CF encerrado] → /meu-time/:colaboradorId/cf/:id/resumo
```

### Entrada na navegação

A tela de resumo é acessada automaticamente após o encerramento do ciclo (manual ou automático) e também pode ser acessada via cards de CFs encerrados em `/ciclos` e no histórico (`032`). Não há entrada nova no menu lateral — é uma sub-tela do ciclo CF.

---

## Questões em aberto

- ~~A decisão TBD de `description.md` impacta o que o colaborador vê neste resumo CF?~~ **Resolvido:** colaborador vê respostas individuais de convidados sem identificação do autor (≥ 3 respondentes exigidos).
- ~~O PDM pode ver as respostas individuais dos convidados na íntegra?~~ **Resolvido:** sim, PDM vê nome + texto completo de cada resposta de convidado.
