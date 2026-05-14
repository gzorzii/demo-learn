# Responder Avaliação como Convidado no CF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que avaliadores convidados acessem e respondam o formulário de avaliação do Continuous Feedback da sujeita, fornecendo feedback textual dentro do prazo de 10 dias de coleta.

---

## Atores envolvidos

- **Avaliador convidado:** qualquer pessoa indicada na lista de avaliadores do CF (par, cliente interno, colaborador de outro time)

---

## Regras de negócio

- (Regra 11) Avaliadores têm 10 dias para responder após o início da coleta.
- (Regra 9) Convidados são opcionais; a obrigatoriedade é apenas de autoavaliação e avaliação do PDM.
- (Regra 4) CF é foco em feedback recente — formulário é curto e fácil de responder.
- (Regra 15) Para exibição de respostas na sumarização, o mínimo é 3 respondentes (anonimização).
- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes; não há follow-up ativo.
- (Regra 33) IA verifica cobertura mínima de ~70% das skills/dimensões e exemplos específicos.
- Avaliador só pode responder uma vez; não pode alterar a resposta após submissão.
- O avaliador acessa o formulário por meio de link/notificação recebida; pode ser um usuário externo sem acesso ao sistema completo.
- O formulário é de texto aberto (sem escala numérica para convidados no CF).

---

## Critérios de aceite

```gherkin
Dado que um avaliador convidado recebe notificação de convite para avaliar
Quando acessa o link do formulário
Então visualiza o formulário de avaliação CF com instruções e campo de texto aberto

Dado que o avaliador está preenchendo o formulário
Quando o avaliador submete a resposta
Então o sistema registra a resposta
E exibe confirmação de envio ao avaliador
E atualiza o progresso de respostas do ciclo

Dado que um avaliador convidado já respondeu o formulário
Quando tenta acessar o formulário novamente
Então o sistema exibe mensagem informando que a avaliação já foi enviada
E não permite nova submissão

Dado que o avaliador preenche uma resposta com detalhes insuficientes (cobertura < 70% das dimensões)
Quando o campo perde foco ou o avaliador tenta submeter
Então a IA exibe alerta inline sugerindo que a resposta seja mais específica
E o avaliador pode revisar antes de confirmar

Dado que o prazo de 10 dias para coleta expirou
Quando um avaliador tenta acessar o formulário
Então o sistema exibe mensagem informando que o prazo encerrou
E não permite submissão

Dado que o CF foi encerrado manualmente pela sujeita (CF manual)
Quando um avaliador tenta acessar o formulário após o encerramento
Então o sistema exibe mensagem informando que o ciclo foi encerrado
```

---

## Quem pode acessar

Qualquer avaliador convidado que conste na lista de avaliadores do ciclo CF ativo, acessando via link de notificação. O formulário deve ser acessível mesmo para usuários sem login completo no sistema (a definir: acesso autenticado simplificado ou token de acesso único).

---

## Fora de escopo

- Autoavaliação do colaborador (tratada em `010`)
- Avaliação do PDM no CF (tratada em `011`)
- Avaliação de convidados no PR (formulário distinto com escala numérica)
- Edição de resposta após submissão

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                    | Rota                             | Propósito                                                 |
|-------------------------|----------------------------------|-----------------------------------------------------------|
| Formulário CF convidado | `/avaliar/cf/:token`             | Formulário de avaliação CF para o avaliador convidado     |
| Confirmação de envio    | `/avaliar/cf/:token/confirmacao` | Tela de confirmação após submissão bem-sucedida           |

### Diagrama de navegação

```
[Notificação recebida pelo avaliador] → link com token único
  └── /avaliar/cf/:token  ← ponto de entrada via notificação (fora do menu)
        ├── [prazo válido + não respondeu] → formulário de texto aberto
        │     ├── [IA alerta — resposta insuficiente] → alerta inline → continuar editando
        │     ├── [submeter] → /avaliar/cf/:token/confirmacao
        │     └── [sair sem submeter] → pode retornar depois pelo mesmo link
        ├── [já respondeu] → mensagem "avaliação já enviada"
        └── [prazo expirado ou ciclo encerrado] → mensagem informativa
```

### Entrada na navegação

Esta tela é acessada exclusivamente via link de notificação recebido pelo avaliador. Não há entrada no menu lateral — o fluxo é externo ao shell principal da aplicação.

---

## Questões em aberto

- O avaliador convidado precisa estar autenticado no sistema para responder, ou o formulário é acessível via token público de acesso único?
- Existe um rascunho automático da resposta antes da submissão (salvar e continuar depois)?
