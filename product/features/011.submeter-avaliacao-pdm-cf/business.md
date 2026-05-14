# Submeter Avaliação do PDM sobre o Liderado no CF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM preencha e submeta sua avaliação sobre o liderado no ciclo de Continuous Feedback, cobrindo os campos de Resultado, Prontidão e Action. A avaliação do PDM é obrigatória e compõe o feedback formal do ciclo.

---

## Atores envolvidos

- **PDM:** único ator que preenche e submete a avaliação do PDM no CF de um liderado

---

## Regras de negócio

- (Regra 9) A avaliação do PDM é obrigatória no CF.
- (Regra 3) Autoavaliação não conta para nota final; a avaliação do PDM no CF também não — CF é focado em feedback e correção de rota, não em score formal.
- (Regra 4) CF é foco no período recente; campos são: Resultado, Prontidão e Action (texto aberto — sem escala numérica no CF).
- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes; sem follow-up ativo.
- (Regra 33) IA verifica cobertura mínima de ~70% das skills/dimensões e exemplos específicos.
- O PDM pode preencher e submeter a avaliação a qualquer momento durante a fase de coleta.
- Após submissão, a avaliação não pode ser alterada.
- O PDM acessa o formulário de cada liderado individualmente.

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado possui um liderado com CF ativo na fase de coleta
Quando o PDM acessa o formulário de avaliação desse liderado
Então visualiza os campos de texto aberto: Resultado, Prontidão e Action

Dado que o PDM está preenchendo a avaliação
E algum campo tem detalhes insuficientes (cobertura < 70% das dimensões)
Quando o campo perde foco ou o PDM tenta submeter
Então a IA exibe alerta inline sugerindo que a resposta seja mais específica
E o PDM pode revisar antes de confirmar

Dado que o PDM preencheu os três campos com conteúdo adequado
Quando o PDM submete a avaliação
Então o sistema registra a avaliação
E exibe confirmação de envio
E atualiza o progresso do ciclo CF do liderado

Dado que o PDM já submeteu a avaliação de um liderado
Quando tenta acessar novamente o formulário desse liderado
Então o sistema exibe a avaliação enviada em modo somente leitura
E não permite edição

Dado que um PDM tenta acessar o formulário de avaliação de um colaborador que não é seu liderado
Quando a ação é executada
Então o sistema rejeita com mensagem de acesso negado
```

---

## Quem pode acessar

Apenas PDMs autenticados, para os liderados diretos que possuem CF ativo na fase de coleta.

---

## Fora de escopo

- Avaliação do PDM no PR (formulário distinto com dimensões D1/D2/D3 e escala 1–4 — tratado em `020`)
- Autoavaliação do colaborador no CF (tratada em `010`)
- Avaliação de convidados no CF (tratada em `009`)
- Edição da avaliação após submissão

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela               | Rota                                   | Propósito                                               |
|--------------------|----------------------------------------|---------------------------------------------------------|
| Avaliação PDM CF   | `/meu-time/:colaboradorId/cf/:id/avaliar` | Formulário de avaliação do PDM para o liderado no CF |

### Diagrama de navegação

```
/meu-time  ← lista de liderados do PDM
  └── [card do liderado — CF ativo — fase: coleta] → /meu-time/:colaboradorId/cf/:id/avaliar
        ├── [avaliação não submetida] → formulário com campos Resultado, Prontidão e Action
        │     ├── [IA alerta — conteúdo insuficiente] → alerta inline → continuar editando
        │     ├── [submeter] → confirmação → /meu-time (progresso atualizado no card)
        │     └── [sair sem submeter] → rascunho mantido → /meu-time
        └── [avaliação já submetida] → modo somente leitura
```

### Entrada na navegação

O formulário é acessado a partir da tela `/meu-time`, disponível no menu lateral para o perfil **PDM**. A ação de avaliação aparece como pendente no card de cada liderado com CF ativo na fase de coleta.
