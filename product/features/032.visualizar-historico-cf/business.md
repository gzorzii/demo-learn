# Colaborador Visualiza Histórico de CFs Anteriores

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir ao colaborador o histórico de ciclos de Continuous Feedback encerrados, permitindo que revise os resumos de feedbacks anteriores para acompanhar sua evolução ao longo do tempo.

---

## Atores envolvidos

- **Colaborador:** visualiza o histórico dos seus próprios CFs encerrados

---

## Regras de negócio

- (Regra 34) IA pós-coleta utiliza histórico de até ~24 meses para análise — o histórico de CFs deve ser preservado e acessível nesse horizonte.
- (Regra 15) Anonimização: mínimo de 3 respondentes para exibição de respostas em feedbacks pontuais; a mesma regra se aplica ao histórico.
- O histórico exibe CFs encerrados em ordem cronológica decrescente (mais recente primeiro).
- Cada ciclo no histórico mostra: tipo do CF (trimestral, onboarding, evento, manual), data de início, data de encerramento e link para o resumo completo.
- O colaborador pode abrir o resumo de qualquer CF encerrado.
- CFs ativos não aparecem no histórico — aparecem na tela de ciclos ativos (`003`).

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui CFs encerrados
Quando acessa a tela de histórico de CFs
Então visualiza a lista de CFs encerrados em ordem cronológica decrescente
E cada item exibe: tipo, data de início, data de encerramento

Dado que o colaborador clica em um CF encerrado da lista
Quando abre o detalhe
Então é redirecionado para o resumo completo daquele ciclo (014.visualizar-resumo-cf)

Dado que um colaborador não possui nenhum CF encerrado
Quando acessa a tela de histórico
Então visualiza mensagem informativa indicando ausência de ciclos anteriores

Dado que um CF ainda está ativo
Quando o colaborador visualiza o histórico
Então esse CF não aparece na lista de histórico
```

---

## Quem pode acessar

Apenas o colaborador autenticado, visualizando apenas os seus próprios CFs encerrados.

---

## Fora de escopo

- Histórico de CFs de liderados pelo PDM (o PDM acessa por sua própria tela de gestão de time)
- Relatório anual do PR (tratado em `031`)
- Download do histórico em PDF (tratado em `033`)
- Visualização de CFs ativos (tratado em `003`)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela              | Rota          | Propósito                                                          |
|-------------------|---------------|--------------------------------------------------------------------|
| Histórico de CFs  | `/historico`  | Lista de CFs encerrados do colaborador em ordem cronológica        |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /historico  ← entrada pelo menu lateral (perfil Colaborador)
        ├── [lista de CFs encerrados]
        │     └── [clicar em um CF] → /ciclos/cf/:id/resumo (014.visualizar-resumo-cf)
        └── [sem CFs encerrados] → mensagem informativa
```

### Entrada na navegação

A tela `/historico` é acessada pelo item "Histórico" (ou equivalente) no menu lateral, visível para o perfil **Colaborador**.
