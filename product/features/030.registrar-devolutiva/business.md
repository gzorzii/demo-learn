# PDM Registra Devolutiva Formal (Status + Data + Comentário)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM registre formalmente a devolutiva conduzida com o colaborador após a calibração, documentando o status da conversa realizada, a data em que ocorreu e um comentário livre sobre os pontos discutidos — garantindo rastreabilidade do processo de feedback final.

---

## Atores envolvidos

- **PDM:** único ator que registra a devolutiva

---

## Regras de negócio

- (Regra 31) Devolutiva: após calibração, o PDM comunica o rating final ao colaborador e conduz conversa sobre feedbacks e posicionamento.
- A devolutiva é um registro formal da conversa real conduzida pelo PDM — não é apenas uma notificação automática.
- O PDM deve registrar: status da devolutiva (realizada / pendente), data em que a conversa ocorreu e comentário livre sobre o que foi discutido.
- O registro só pode ser feito após a calibração do colaborador estar concluída (score final disponível).
- O PDM registra devolutiva individualmente para cada liderado.
- Após registrar a devolutiva como "realizada", o colaborador pode acessar o relatório final do PR (`031`).

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado possui um liderado com calibração concluída
Quando o PDM acessa o card do liderado
Então visualiza a ação "Registrar devolutiva" disponível

Dado que o PDM acessa o formulário de devolutiva
Quando preenche status "realizada", data da conversa e comentário
E confirma o registro
Então o sistema salva a devolutiva do liderado
E exibe confirmação de registro

Dado que o PDM registra a devolutiva como "realizada"
Quando o registro é salvo
Então o colaborador passa a ter acesso ao relatório final do PR (031)

Dado que o PDM não preenche a data da conversa ao registrar status "realizada"
Quando tenta confirmar
Então o sistema exibe mensagem de erro indicando que a data é obrigatória para status "realizada"

Dado que o PDM tenta registrar devolutiva de um colaborador cuja calibração ainda não foi concluída
Quando tenta acessar o formulário
Então o sistema exibe mensagem informando que a devolutiva só pode ser registrada após a calibração

Dado que um PDM tenta acessar o formulário de devolutiva de um colaborador que não é seu liderado
Quando a ação é executada
Então o sistema rejeita com mensagem de acesso negado
```

---

## Quem pode acessar

Apenas PDMs autenticados, para liderados cuja calibração foi concluída.

---

## Fora de escopo

- Condução da sessão de calibração (tratada em `028`)
- Visualização do relatório final pelo colaborador (tratada em `031`)
- Devolutiva automática por sistema (a devolutiva é sempre um registro humano do PDM)
- Comentários do colaborador sobre a devolutiva recebida

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                  | Rota                                           | Propósito                                                  |
|-----------------------|------------------------------------------------|------------------------------------------------------------|
| Registro de devolutiva | `/meu-time/:colaboradorId/pr/:id/devolutiva`  | Formulário para o PDM registrar a devolutiva formal        |

### Diagrama de navegação

```
/meu-time  ← lista de liderados do PDM
  └── [card do liderado — calibração concluída] → ação "Registrar devolutiva"
        └── /meu-time/:colaboradorId/pr/:id/devolutiva
              ├── [preencher: status + data + comentário]
              ├── [salvar] → devolutiva registrada → /meu-time (status do liderado atualizado)
              └── [cancelar] → /meu-time
```

### Entrada na navegação

A ação é acessada a partir do card do liderado em `/meu-time`, disponível para o perfil **PDM** quando a calibração do liderado está concluída. Aparece como ação pendente até que a devolutiva seja registrada.
