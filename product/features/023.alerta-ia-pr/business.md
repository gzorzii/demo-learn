# Alerta de IA para Respostas Insuficientes no PR

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir alertas inline gerados pela IA durante o preenchimento dos comentários pelo PDM no formulário de avaliação do PR, sinalizando quando o conteúdo não cobre adequadamente as dimensões avaliadas (D1, D2 ou D3), para que o PDM melhore a qualidade antes de submeter.

---

## Atores envolvidos

- **PDM:** recebe alertas ao preencher os comentários das 3 dimensões no formulário de avaliação do PR

---

## Regras de negócio

- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes; sem follow-up ativo nem investigação conversacional.
- (Regra 33) A IA verifica cobertura mínima de ~70% das skills/dimensões do papel e se há exemplos específicos (não genéricos).
- O alerta é inline — exibido no próprio campo de comentário de cada dimensão, não em tela separada.
- O alerta é não-bloqueante: o PDM pode ignorar e submeter mesmo com a sugestão visível.
- A IA não faz perguntas de acompanhamento nem conduz investigação conversacional.
- O alerta é gerado no momento em que o campo perde foco ou o PDM aciona a submissão.
- Esta feature cobre apenas o alerta durante o preenchimento; a sumarização pós-coleta é tratada em `034`.
- O contexto do PR é longitudinal (padrões do ciclo) — a IA verifica se o comentário aborda o período completo do ciclo, não apenas eventos recentes.

---

## Critérios de aceite

```gherkin
Dado que um PDM está preenchendo o comentário de D1 no formulário de avaliação PR
Quando o campo perde foco e o conteúdo tem cobertura inferior a ~70% dos critérios da dimensão
Então a IA exibe alerta inline abaixo do campo com sugestão de melhoria

Dado que um PDM está preenchendo o comentário de D2 ou D3 no formulário PR
Quando o campo perde foco e o conteúdo não contém exemplos específicos
Então a IA exibe alerta inline sugerindo a inclusão de exemplos concretos

Dado que a IA exibe um alerta inline em qualquer dimensão
Quando o PDM ignora o alerta e tenta submeter a avaliação
Então o sistema aceita a submissão normalmente (alerta é não-bloqueante)

Dado que a IA exibe um alerta inline
Quando o PDM edita o campo e melhora o conteúdo
Então o alerta é removido ou atualizado indicando que o conteúdo é adequado

Dado que o PDM está preenchendo o comentário com conteúdo adequado e exemplos específicos
Quando o campo perde foco
Então nenhum alerta é exibido

Dado que o sistema de IA está indisponível
Quando o PDM preenche e sai do campo
Então nenhum alerta é exibido e o preenchimento continua normalmente (degradação silenciosa)
```

---

## Quem pode acessar

A funcionalidade de alerta está integrada ao formulário de avaliação PDM no PR (`020`), acessado apenas por PDMs autenticados para seus liderados com PR ativo na fase de coleta.

---

## Fora de escopo

- Alerta de IA no CF (tratado em `015` — formulário e contexto distintos)
- Sumarização e análise pós-coleta pela IA (tratados em `034`)
- Investigação conversacional ou follow-up pela IA
- Bloqueio de submissão por resposta insuficiente
- Alertas para avaliadores pares no PR

---

## Fluxo de telas

Esta feature não introduz telas próprias — é um componente inline integrado ao formulário de avaliação PDM no PR.

### Localização do alerta

| Formulário           | Rota                                       | Onde o alerta aparece                   |
|----------------------|--------------------------------------------|-----------------------------------------|
| Avaliação PDM PR     | `/meu-time/:colaboradorId/pr/:id/avaliar`  | Abaixo do campo de comentário de D1/D2/D3 |

### Diagrama de navegação

```
/meu-time/:colaboradorId/pr/:id/avaliar  (020.submeter-avaliacao-pdm-pr)
  └── [campo comentário D1/D2/D3 perde foco]
        ├── [conteúdo insuficiente] → alerta inline exibido abaixo do campo
        │     ├── [PDM edita] → alerta atualizado ou removido
        │     └── [PDM ignora e submete] → submissão aceita normalmente
        └── [conteúdo adequado] → sem alerta
```

### Entrada na navegação

Nenhuma. Este componente é parte do formulário de avaliação PDM PR (`020`) e não tem entrada própria no menu lateral.
