# PDM Ajusta Score Final (±1) com Justificativa

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM faça um ajuste pontual de ±1 ponto no score de uma dimensão do liderado após a submissão da avaliação principal, registrando obrigatoriamente uma justificativa textual para garantir auditabilidade da alteração.

---

## Atores envolvidos

- **PDM:** único ator que realiza o ajuste de score

---

## Regras de negócio

- O ajuste é limitado a ±1 ponto por dimensão em relação ao score submetido na avaliação principal.
- A justificativa em texto livre é obrigatória para qualquer ajuste realizado.
- O ajuste é uma ação separada da avaliação principal (`020`) — é auditável individualmente (data, autor, valor anterior, valor novo, justificativa).
- Cada ajuste é registrado no histórico de auditoria do ciclo PR do liderado.
- O ajuste pode ser realizado após submissão da avaliação principal e antes da submissão para calibração (`022`).
- O PDM pode ajustar apenas liderados diretos.

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado submeteu a avaliação principal de um liderado no PR
E ainda não submeteu para calibração
Quando o PDM acessa a opção de ajuste de score
Então visualiza os scores atuais por dimensão (D1, D2, D3) e a opção de ajustar cada um em ±1

Dado que o PDM ajusta o score de D1 em +1 e preenche a justificativa
Quando confirma o ajuste
Então o sistema registra o novo score (valor anterior + 1) com a justificativa
E registra no histórico de auditoria: data, PDM, dimensão, valor anterior, valor novo, justificativa
E o Nine Box preview é atualizado com o novo posicionamento

Dado que o PDM ajusta o score de D2 em -1 e preenche a justificativa
Quando confirma o ajuste
Então o sistema registra o novo score com a justificativa e atualiza o histórico de auditoria

Dado que o PDM tenta submeter um ajuste sem preencher a justificativa
Quando tenta confirmar
Então o sistema rejeita o ajuste com mensagem indicando que a justificativa é obrigatória

Dado que o PDM tenta ajustar um score em mais de ±1 ponto
Quando a ação é executada
Então o sistema rejeita o ajuste com mensagem informando o limite de ±1

Dado que um PDM tentaajustar o score de um colaborador que não é seu liderado
Quando a ação é executada
Então o sistema rejeita com mensagem de acesso negado
```

---

## Quem pode acessar

Apenas PDMs autenticados, para liderados com PR ativo que já tiveram a avaliação principal submetida (`020`) e ainda não foram submetidos para calibração (`022`).

---

## Fora de escopo

- Submissão da avaliação principal nas 3 dimensões (tratada em `020`)
- Ajuste de score após calibração (o score final é decidido pelo Calibrador em `028`)
- Ajuste pelo Calibrador durante a sessão de calibração (tratado em `028`)
- Justificativas automáticas ou sugeridas pela IA

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                  | Rota                                          | Propósito                                                   |
|-----------------------|-----------------------------------------------|-------------------------------------------------------------|
| Ajuste de score PR    | `/meu-time/:colaboradorId/pr/:id/ajustar`     | PDM ajusta score ±1 com justificativa obrigatória           |

### Diagrama de navegação

```
/meu-time/:colaboradorId/pr/:id/avaliar  (020 — avaliação já submetida, modo somente leitura)
  └── [botão "Ajustar score"] → /meu-time/:colaboradorId/pr/:id/ajustar
        ├── [seleciona dimensão + valor ±1 + justificativa preenchida]
        │     ├── [confirmar] → score ajustado → histórico registrado → /meu-time/:colaboradorId/pr/:id/avaliar
        │     └── [cancelar] → /meu-time/:colaboradorId/pr/:id/avaliar
        └── [justificativa ausente] → erro de validação inline
```

### Entrada na navegação

O ajuste de score é acessado a partir da tela de avaliação do liderado em modo somente leitura (`020`), após a avaliação principal já ter sido submetida. Disponível para o perfil **PDM** enquanto o ciclo não for submetido para calibração.
