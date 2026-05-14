# PDM Submete Liderado para Calibração

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM submeta formalmente o liderado para a fila de calibração após concluir a avaliação do PR, sinalizando ao sistema que o colaborador está pronto para entrar na sessão de calibração com o Calibrador e o BP.

---

## Atores envolvidos

- **PDM:** único ator que submete o liderado para calibração

---

## Regras de negócio

- (Regra 28) O sistema filtra colaboradores com status "pronto para calibrar"; o Calibrador gera a agenda da sessão com base nesse status.
- (Regra 30) Scores decididos na calibração são o resultado final do ciclo PR.
- A submissão para calibração só é permitida após o PDM ter concluído a avaliação principal (`020`) — com ou sem ajuste de score (`021`).
- Após submissão para calibração, o PDM não pode mais alterar os scores.
- O sistema deve exibir um resumo das avaliações do liderado antes da confirmação da submissão.
- O PDM só pode submeter liderados diretos.

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado submeteu a avaliação principal de um liderado no PR
E (opcionalmente) realizou ajuste de score
Quando o PDM acessa a opção "Submeter para calibração"
Então o sistema exibe resumo das avaliações: scores D1/D2/D3, justificativas e posicionamento no Nine Box

Dado que o PDM revisa o resumo e confirma a submissão
Quando a confirmação é realizada
Então o status do liderado no ciclo PR é alterado para "pronto para calibrar"
E o PDM não pode mais alterar os scores desse liderado
E a ação é registrada com data e hora

Dado que o PDM ainda não submeteu a avaliação principal do liderado
Quando tenta acessar a opção "Submeter para calibração"
Então o sistema exibe mensagem indicando que a avaliação principal deve ser concluída primeiro

Dado que um PDM tenta submeter para calibração um colaborador que não é seu liderado
Quando a ação é executada
Então o sistema rejeita com mensagem de acesso negado

Dado que um liderado já foi submetido para calibração
Quando o PDM tenta submeter novamente
Então o sistema informa que o liderado já está na fila de calibração
```

---

## Quem pode acessar

Apenas PDMs autenticados, para liderados com PR ativo que já tiveram a avaliação principal concluída (`020`).

---

## Fora de escopo

- Geração da agenda de calibração pelo Admin (tratada em `026`)
- Condução da sessão de calibração (tratada em `028`)
- Prework do PDM antes da sessão (tratado em `027`)
- Alteração de scores após submissão para calibração

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                        | Rota                                            | Propósito                                                      |
|-----------------------------|--------------------------------------------------|----------------------------------------------------------------|
| Submissão para calibração   | `/meu-time/:colaboradorId/pr/:id/calibracao`    | PDM revisa e confirma submissão do liderado para calibração    |

### Diagrama de navegação

```
/meu-time/:colaboradorId/pr/:id/avaliar  (020 — avaliação submetida)
  └── [botão "Submeter para calibração"] → /meu-time/:colaboradorId/pr/:id/calibracao
        ├── [avaliação principal completa] → tela de revisão com scores D1/D2/D3 e Nine Box
        │     ├── [confirmar submissão] → status "pronto para calibrar" → /meu-time (status atualizado)
        │     └── [cancelar] → /meu-time/:colaboradorId/pr/:id/avaliar
        └── [avaliação principal incompleta] → mensagem de impedimento
```

### Entrada na navegação

A ação é acessada a partir da tela de avaliação do liderado em `/meu-time`, disponível para o perfil **PDM** após a conclusão da avaliação principal no PR.
