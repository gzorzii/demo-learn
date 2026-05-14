# PDM Escolhe Modelo de Alocação do Liderado (Team / StaffAug / SDLC)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM defina o modelo de alocação do liderado (Team, Staff Aug ou SDLC) no início do ciclo de Performance Review, determinando assim o quórum mínimo de pares avaliadores exigido para aquele ciclo.

---

## Atores envolvidos

- **PDM:** único ator que realiza a escolha do modelo de alocação

---

## Regras de negócio

- (Regra 22) PDM escolhe o modelo de alocação do liderado (Team / Staff Aug / SDLC); essa escolha define o quórum mínimo de pares.
- (Regra 23) Quórum: Team = mínimo 5 pares; Staff Aug / SDLC = mínimo 1 par.
- (Regra 24) Se o PDM não selecionar modelo dentro do prazo de validação de avaliadores, o sistema aplica 5 peers automaticamente.
- A escolha do modelo deve ocorrer antes ou durante a fase de validação de avaliadores (prazo de 7 dias).
- Após o início da coleta, o modelo não pode ser alterado.
- O PDM define o modelo individualmente para cada liderado com PR ativo.

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado possui um liderado com PR ativo na fase de configuração
Quando o PDM acessa a configuração do PR desse liderado
Então visualiza as opções de modelo: Team, Staff Aug e SDLC
E visualiza o quórum mínimo de pares correspondente a cada opção

Dado que o PDM seleciona o modelo "Team"
Quando confirma a seleção
Então o sistema registra o modelo "Team" para o ciclo PR desse liderado
E o quórum mínimo exigido na validação de avaliadores passa a ser 5 pares

Dado que o PDM seleciona o modelo "Staff Aug"
Quando confirma a seleção
Então o sistema registra o modelo "Staff Aug"
E o quórum mínimo exigido passa a ser 1 par

Dado que o PDM seleciona o modelo "SDLC"
Quando confirma a seleção
Então o sistema registra o modelo "SDLC"
E o quórum mínimo exigido passa a ser 1 par

Dado que o prazo de validação de avaliadores expirou sem que o PDM escolhesse o modelo
Quando o sistema processa a expiração
Então o sistema aplica o padrão de 5 peers automaticamente (equivalente ao modelo Team)

Dado que a coleta já foi iniciada para o PR de um liderado
Quando o PDM tenta alterar o modelo de alocação
Então o sistema rejeita a alteração com mensagem informando que o modelo não pode ser alterado após início da coleta
```

---

## Quem pode acessar

Apenas PDMs autenticados, para liderados com PR ativo ainda na fase de configuração (antes do início da coleta).

---

## Fora de escopo

- Validação e edição da lista de avaliadores (tratada em `017`)
- Avaliação do liderado nas dimensões D1/D2/D3 pelo PDM (tratada em `020`)
- Configuração de modelos de alocação globais pelo Admin

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                       | Rota                                        | Propósito                                              |
|----------------------------|---------------------------------------------|--------------------------------------------------------|
| Escolha de modelo PR       | `/meu-time/:colaboradorId/pr/:id/modelo`    | PDM seleciona o modelo de alocação do liderado no PR   |

### Diagrama de navegação

```
/meu-time  ← lista de liderados do PDM
  └── [card do liderado — PR ativo — fase: configuração] → /meu-time/:colaboradorId/pr/:id/modelo
        ├── [selecionar Team / Staff Aug / SDLC]
        ├── [confirmar] → modelo registrado → /meu-time/:colaboradorId/pr/:id/avaliadores (017)
        └── [cancelar] → /meu-time (modelo não definido — será aplicado padrão ao expirar prazo)
```

### Entrada na navegação

A escolha do modelo é acessada a partir do card do liderado em `/meu-time`, disponível no menu lateral para o perfil **PDM**. É uma ação obrigatória no fluxo do PR para cada liderado, exibida como pendente enquanto o ciclo estiver na fase de configuração.
