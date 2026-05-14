# PDM Escreve Contexto/Sumário do Liderado antes da Sessão de Calibração

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM redija um texto de contexto e sumário sobre cada liderado aproximadamente 2 semanas antes da sessão de calibração, preparando os argumentos que serão apresentados durante a sessão para sustentar o posicionamento no Nine Box.

---

## Atores envolvidos

- **PDM:** único ator que preenche o prework de calibração dos seus liderados

---

## Regras de negócio

- (Regra 29) Sessão de calibração: PDMs participam e discutem o posicionamento no Nine Box dos seus liderados.
- (Regra 31) Devolutiva após calibração é conduzida pelo PDM — o prework apoia a preparação do PDM para ambas as etapas.
- O prework é um campo de texto livre (contexto/sumário narrativo sobre o colaborador).
- O prework deve ser realizado antes da sessão de calibração, em geral ~2 semanas antes.
- O prework é visível para o Calibrador e o BP durante a sessão de calibração (`028`).
- O PDM pode editar o prework até o início da sessão de calibração.
- O PDM preenche prework individualmente para cada liderado convocado para a sessão.

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado possui um liderado convocado para uma sessão de calibração
Quando o PDM acessa o card do liderado na tela de preparação de calibração
Então visualiza o campo de texto para preenchimento do contexto/sumário

Dado que o PDM preenche e salva o contexto do liderado
Quando confirma o salvamento
Então o texto é registrado e associado ao liderado na sessão de calibração
E uma confirmação de salvamento é exibida

Dado que o PDM preencheu o prework anteriormente
Quando acessa novamente antes da sessão
Então visualiza o texto já salvo e pode editá-lo

Dado que a sessão de calibração já foi iniciada
Quando o PDM tenta editar o prework
Então o sistema informa que o prework não pode ser alterado após o início da sessão
E o texto é exibido em modo somente leitura

Dado que um PDM tenta acessar o prework de um colaborador que não é seu liderado
Quando a ação é executada
Então o sistema rejeita com mensagem de acesso negado
```

---

## Quem pode acessar

Apenas PDMs autenticados cujos liderados foram convocados para uma sessão de calibração.

---

## Fora de escopo

- Condução da sessão de calibração (tratada em `028`)
- Avaliação nas dimensões D1/D2/D3 pelo PDM (tratada em `020`)
- Devolutiva após calibração (tratada em `030`)
- Geração automática do contexto por IA (não previsto no MVP)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                         | Rota                                             | Propósito                                                         |
|------------------------------|--------------------------------------------------|-------------------------------------------------------------------|
| Prework de calibração        | `/meu-time/:colaboradorId/pr/:id/prework`        | Campo de texto para o PDM registrar contexto do liderado          |

### Diagrama de navegação

```
/meu-time  ← lista de liderados do PDM
  └── [card do liderado — convocado para sessão de calibração] → ação "Preparar prework"
        └── /meu-time/:colaboradorId/pr/:id/prework
              ├── [prework não preenchido] → campo de texto vazio
              │     ├── [salvar] → texto registrado → /meu-time (status atualizado)
              │     └── [cancelar] → /meu-time
              ├── [prework já preenchido — antes da sessão] → modo de edição
              │     ├── [salvar alterações] → texto atualizado → /meu-time
              │     └── [cancelar] → /meu-time
              └── [sessão já iniciada] → modo somente leitura
```

### Entrada na navegação

O prework é acessado a partir do card do liderado em `/meu-time`, disponível para o perfil **PDM** quando o liderado foi convocado para uma sessão de calibração. Aparece como uma ação pendente até que o texto seja preenchido.
