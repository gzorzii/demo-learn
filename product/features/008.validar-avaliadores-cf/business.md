# Validar e Ajustar Lista de Avaliadores no CF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador (sujeita) e o PDM revisem, adicionem ou removam avaliadores da lista sugerida pelo ONA antes do início da coleta no ciclo de CF, garantindo que o grupo de respondentes seja adequado e representativo.

---

## Atores envolvidos

- **Colaborador:** revisa e edita a lista de avaliadores do seu próprio CF
- **PDM:** pode revisar e opcionalmente adicionar avaliadores à lista do seu liderado

---

## Regras de negócio

- (Regra 9) Avaliadores obrigatórios: colaborador (autoavaliação) e PDM; convidados são opcionais, com limite de 10.
- (Regra 10) Prazo de 7 dias para validação; após esse prazo, ONA seleciona automaticamente os avaliadores restantes e a coleta inicia.
- (Regra 36) ONA no MVP usa dados simulados (mock) — sugestões são geradas por algoritmo simplificado.
- O colaborador pode adicionar ou remover avaliadores convidados livremente dentro do prazo e do limite de 10.
- O PDM pode adicionar avaliadores à lista do liderado; não pode remover avaliadores adicionados pelo colaborador.
- Avaliadores obrigatórios (self e PDM) não podem ser removidos.
- Ao expirar o prazo de 7 dias sem confirmação explícita, o sistema aplica a seleção do ONA automaticamente e inicia a coleta.

---

## Critérios de aceite

```gherkin
Dado que um colaborador possui um CF ativo na fase de validação de avaliadores
Quando acessa a tela de validação de avaliadores
Então visualiza a lista sugerida pelo ONA (mock) com nome e papel de cada avaliador

Dado que o colaborador está na fase de validação
E a lista tem menos de 10 convidados
Quando o colaborador adiciona um novo avaliador
Então o avaliador é incluído na lista

Dado que o colaborador está na fase de validação
E a lista já possui 10 convidados
Quando o colaborador tenta adicionar mais um avaliador
Então o sistema exibe mensagem de impedimento informando o limite de 10

Dado que o colaborador está na fase de validação
Quando o colaborador remove um avaliador convidado da lista
Então o avaliador é removido da lista

Dado que o colaborador tenta remover um avaliador obrigatório (self ou PDM)
Quando a ação é executada
Então o sistema rejeita a remoção com mensagem explicativa

Dado que o prazo de 7 dias para validação expirou sem confirmação
Quando o sistema processa a expiração
Então o ONA aplica automaticamente a seleção de avaliadores restantes
E a fase de coleta é iniciada automaticamente
E colaborador e PDM são notificados

Dado que o PDM acessa a lista de avaliadores do liderado durante o prazo de validação
Quando o PDM adiciona um avaliador
Então o avaliador é incluído na lista (respeitando o limite de 10)

Dado que o colaborador confirma a lista de avaliadores antes dos 7 dias
Quando a confirmação é realizada
Então a fase de coleta é iniciada imediatamente
E os avaliadores são notificados
```

---

## Quem pode acessar

- Colaborador autenticado: acessa a lista do seu próprio CF ativo durante a fase de validação
- PDM autenticado: acessa a lista de avaliadores dos seus liderados durante o prazo de validação

---

## Fora de escopo

- Validação de avaliadores no PR (tem regras distintas — tratada em `017`)
- Integração real com ONA (fase 2 — regra 36)
- Notificação individual a cada avaliador adicionado (tratado no início da coleta)
- Edição de avaliadores após o início da coleta

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                       | Rota                              | Propósito                                              |
|----------------------------|-----------------------------------|--------------------------------------------------------|
| Validação de avaliadores   | `/ciclos/cf/:id/avaliadores`      | Lista e edição de avaliadores do ciclo CF              |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos)
  └── [CF ativo — fase: validação de avaliadores] → /ciclos/cf/:id/avaliadores
        ├── [adicionar avaliador] → modal de busca e seleção → retorna à lista
        ├── [remover avaliador convidado] → confirmação inline → atualiza lista
        ├── [confirmar lista] → inicia coleta → notifica avaliadores → /ciclos/cf/:id
        └── [prazo de 7 dias expirado] → ONA aplica automaticamente → coleta inicia → /ciclos/cf/:id
```

### Entrada na navegação

Esta tela é acessada a partir do card do CF ativo em `/ciclos`, visível para os perfis **Colaborador** e **PDM**. O item de menu não cria entrada nova — é uma sub-tela do ciclo CF.
