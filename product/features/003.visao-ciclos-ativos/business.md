# Visão CF + PR: Acompanhar Ciclos Ativos do Colaborador

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir ao colaborador (e ao seu PDM) um painel unificado e somente leitura com os ciclos de Continuous Feedback (CF) e Performance Review (PR) ativos, permitindo que ambos entendam o estado atual sem precisar navegar entre seções separadas.

---

## Atores envolvidos

- **Colaborador:** visualiza seus próprios ciclos ativos (CF e PR)
- **PDM:** visualiza os ciclos ativos de cada um de seus liderados

---

## Regras de negócio

- (Regra 4) CF e PR são ciclos de natureza distinta; nunca correm em paralelo para a mesma sujeita.
- (Regra 5) A visão "Sync" (roxa) é apenas leitura agregada — não é um terceiro tipo de ciclo; não cria nem altera nenhum dado.
- A tela exibe o status atual de cada ciclo ativo: fase em andamento, prazo restante, percentual de respostas coletadas.
- Se não houver ciclo ativo, a tela exibe mensagem informativa.
- O PDM acessa a visão de cada liderado individualmente a partir da lista do seu time.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um ciclo de CF ativo
Quando acessa a tela de ciclos ativos
Então visualiza o ciclo CF com fase atual, prazo restante e percentual de respostas coletadas

Dado que um colaborador autenticado possui um ciclo de PR ativo
Quando acessa a tela de ciclos ativos
Então visualiza o ciclo PR com fase atual, prazo restante e percentual de respostas coletadas

Dado que um colaborador autenticado não possui nenhum ciclo ativo
Quando acessa a tela de ciclos ativos
Então visualiza mensagem informativa indicando ausência de ciclos em andamento

Dado que um PDM autenticado visualiza a tela de ciclos de um liderado específico
Quando a tela é carregada
Então o PDM vê os mesmos ciclos ativos que o colaborador veria para aquele liderado

Dado que CF e PR nunca correm em paralelo para a mesma sujeita (regra 4)
Quando a tela exibe ciclos ativos
Então no máximo um ciclo de cada tipo pode aparecer ativo ao mesmo tempo para uma sujeita
```

---

## Quem pode acessar

- Colaborador autenticado: acessa a visão dos seus próprios ciclos
- PDM autenticado: acessa a visão dos ciclos ativos de cada liderado na sua lista de time

---

## Fora de escopo

- Iniciar, encerrar ou modificar ciclos a partir desta tela
- Histórico de ciclos encerrados (tratado em `032.visualizar-historico-cf` e `031.visualizar-relatorio-pr`)
- Notificações de mudança de estado (tratadas nas features de iniciação de cada ciclo)
- Visão agregada de todos os colaboradores do time pelo PDM (tratada em features de gestão do time)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela              | Rota       | Propósito                                                              |
|-------------------|------------|------------------------------------------------------------------------|
| Ciclos ativos     | `/ciclos`  | Painel somente leitura com CF e PR ativos do colaborador autenticado   |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /ciclos  ← entrada pelo menu lateral (Colaborador e PDM)
        ├── [sem ciclo ativo] → mensagem informativa
        ├── [CF ativo] → exibe card do ciclo CF com status e prazo
        │     └── [ação de autoavaliação] → /ciclos/cf/:id/autoavaliacao (010)
        └── [PR ativo] → exibe card do ciclo PR com status e prazo
              └── [ação de autoavaliação] → /ciclos/pr/:id/autoavaliacao (019)
```

### Entrada na navegação

Esta tela é acessada pelo item "Meus Ciclos" (ou equivalente) no menu lateral, visível para os perfis **Colaborador** e **PDM**. O PDM pode chegar a esta visão também pela tela de gestão do time, selecionando um liderado específico.

---

## Questões em aberto

- Qual a nomenclatura do item no menu lateral para o Colaborador? ("Meus Ciclos", "Visão Geral", "Sync"?)
- O PDM acessa a visão de ciclos ativos do liderado pela mesma rota `/ciclos` com um parâmetro de colaborador, ou por uma rota distinta como `/meu-time/:id/ciclos`?
