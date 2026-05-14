# Validar e Ajustar Lista de Avaliadores no PR

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador e o PDM revisem, adicionem ou removam avaliadores da lista de pares para o ciclo de Performance Review, garantindo que o quórum mínimo definido pelo modelo de alocação seja atingido antes do início da coleta.

---

## Atores envolvidos

- **Colaborador:** revisa e edita a lista de avaliadores pares do seu próprio PR
- **PDM:** pode revisar e adicionar avaliadores à lista do liderado; também define o modelo de alocação (ação separada em `018`)

---

## Regras de negócio

- (Regra 21) PR é avaliação 360: autoavaliação + pares + PDM.
- (Regra 22) PDM escolhe o modelo de alocação (Team / Staff Aug / SDLC) — define o quórum mínimo de pares.
- (Regra 23) Quórum: autoavaliação + PDM obrigatórios; Team: mínimo 5 pares; Staff Aug / SDLC: mínimo 1 par.
- (Regra 24) Se ninguém adicionar convidados e o PDM não selecionar modelo, o sistema adiciona 5 peers automaticamente.
- (Regra 25) Limite de até 10 convidados por ciclo PR.
- (Regra 10) O colaborador tem 7 dias para validar a lista; após esse prazo, ONA seleciona automaticamente e a coleta inicia.
- (Regra 36) ONA no MVP usa dados simulados (mock).
- Avaliadores obrigatórios (self e PDM) não podem ser removidos.
- O colaborador não pode adicionar menos avaliadores do que o quórum mínimo exigido pelo modelo.
- O sistema deve bloquear o início da coleta se o quórum mínimo não for atingido e o prazo ainda não expirou.

---

## Critérios de aceite

```gherkin
Dado que um colaborador possui um PR ativo na fase de validação de avaliadores
E o modelo de alocação já foi definido pelo PDM (018)
Quando acessa a tela de validação de avaliadores do PR
Então visualiza a lista sugerida pelo ONA com o quórum mínimo exibido para o modelo definido

Dado que o modelo é "Team" (quórum: 5 pares)
E a lista atual tem menos de 5 pares
Quando o colaborador confirma a lista
Então o sistema bloqueia a confirmação com mensagem indicando que o quórum mínimo de 5 pares não foi atingido

Dado que o modelo é "Staff Aug" ou "SDLC" (quórum: 1 par)
E a lista tem pelo menos 1 par
Quando o colaborador confirma
Então a coleta é iniciada normalmente

Dado que o colaborador está na fase de validação
E a lista tem menos de 10 convidados
Quando o colaborador adiciona um avaliador par
Então o avaliador é incluído na lista

Dado que a lista já possui 10 convidados
Quando o colaborador tenta adicionar mais um avaliador
Então o sistema exibe mensagem de impedimento informando o limite de 10

Dado que o prazo de 7 dias expirou sem confirmação da lista
Quando o sistema processa a expiração
Então o ONA aplica automaticamente a seleção de avaliadores respeitando o quórum
E a coleta é iniciada
E colaborador e PDM são notificados

Dado que nenhum convidado foi adicionado e o PDM não selecionou modelo
Quando o prazo de 7 dias expira
Então o sistema adiciona automaticamente 5 peers
E a coleta é iniciada
```

---

## Quem pode acessar

- Colaborador autenticado: acessa a lista do seu próprio PR ativo durante a fase de validação
- PDM autenticado: acessa a lista de avaliadores dos seus liderados durante o prazo de validação

---

## Fora de escopo

- Validação de avaliadores no CF (regras distintas — tratada em `008`)
- Escolha do modelo de alocação pelo PDM (tratada em `018`)
- Integração real com ONA (fase 2 — regra 36)
- Edição de avaliadores após o início da coleta

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                           | Rota                             | Propósito                                                |
|--------------------------------|----------------------------------|----------------------------------------------------------|
| Validação de avaliadores PR    | `/ciclos/pr/:id/avaliadores`     | Lista e edição de avaliadores pares do ciclo PR          |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos)
  └── [PR ativo — fase: validação de avaliadores] → /ciclos/pr/:id/avaliadores
        ├── [adicionar avaliador] → modal de busca e seleção → retorna à lista
        ├── [remover avaliador convidado] → confirmação inline → atualiza lista
        ├── [confirmar lista — quórum atingido] → inicia coleta → notifica avaliadores → /ciclos/pr/:id
        ├── [confirmar lista — quórum não atingido] → mensagem de impedimento inline
        └── [prazo de 7 dias expirado] → ONA aplica automaticamente → coleta inicia
```

### Entrada na navegação

A tela é acessada a partir do card do PR ativo em `/ciclos`, visível para os perfis **Colaborador** e **PDM**. O PDM também acessa pelo card do liderado em `/meu-time`.
