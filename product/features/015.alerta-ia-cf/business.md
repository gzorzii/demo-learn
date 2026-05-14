# Alerta de IA para Respostas Insuficientes no CF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir alertas inline gerados pela IA durante o preenchimento das respostas no CF, sinalizando quando o conteúdo digitado tem detalhes insuficientes ou não cobre adequadamente as dimensões esperadas, para que o avaliador melhore a qualidade antes de submeter.

---

## Atores envolvidos

- **Colaborador:** recebe alerta ao preencher a autoavaliação no CF
- **PDM:** recebe alerta ao preencher a avaliação do liderado no CF
- **Avaliador convidado:** recebe alerta ao preencher o formulário de avaliação CF

---

## Regras de negócio

- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes; sem follow-up ativo nem investigação conversacional.
- (Regra 33) A IA verifica cobertura mínima de ~70% das skills/dimensões do papel e se há exemplos específicos (não genéricos).
- O alerta é inline — exibido no próprio campo de texto, não em uma tela separada.
- O alerta é não-bloqueante: o avaliador pode ignorar e submeter mesmo com a sugestão visível.
- A IA não faz perguntas de acompanhamento nem conduz investigação conversacional.
- O alerta é gerado no momento em que o campo perde foco ou o avaliador aciona a submissão.
- Esta feature cobre apenas o alerta durante o preenchimento; a sumarização pós-coleta é tratada em `034`.

---

## Critérios de aceite

```gherkin
Dado que um avaliador está preenchendo um campo de texto no formulário CF
Quando o campo perde foco e o conteúdo tem cobertura inferior a ~70% das dimensões esperadas
Então a IA exibe um alerta inline abaixo do campo com sugestão de melhoria

Dado que um avaliador está preenchendo um campo de texto no formulário CF
Quando o campo perde foco e o conteúdo não contém exemplos específicos
Então a IA exibe alerta inline sugerindo a inclusão de exemplos concretos

Dado que a IA exibe um alerta inline
Quando o avaliador ignora o alerta e tenta submeter a resposta
Então o sistema aceita a submissão normalmente (alerta é não-bloqueante)

Dado que a IA exibe um alerta inline
Quando o avaliador edita o campo e melhora o conteúdo
Então o alerta é removido ou atualizado para indicar que o conteúdo é adequado

Dado que o avaliador está preenchendo um campo de texto no formulário CF
Quando o campo perde foco e o conteúdo tem cobertura adequada e exemplos específicos
Então nenhum alerta é exibido

Dado que o sistema de IA está indisponível
Quando o avaliador preenche e sai do campo
Então nenhum alerta é exibido e o preenchimento continua normalmente (degradação silenciosa)
```

---

## Quem pode acessar

A funcionalidade de alerta está integrada aos formulários de preenchimento no CF:
- Formulário de autoavaliação CF (`010`) — acessado pelo Colaborador
- Formulário de avaliação PDM CF (`011`) — acessado pelo PDM
- Formulário de avaliação convidado CF (`009`) — acessado pelo Avaliador convidado

---

## Fora de escopo

- Alerta de IA no PR (tratado em `023` — dimensões e regras distintas)
- Sumarização e análise pós-coleta pela IA (tratados em `034`)
- Investigação conversacional ou follow-up pela IA
- Bloqueio de submissão por resposta insuficiente

---

## Fluxo de telas

Esta feature não introduz telas próprias — é um componente inline integrado aos formulários de CF existentes.

### Localização do alerta

| Formulário              | Rota                                  | Onde o alerta aparece           |
|-------------------------|---------------------------------------|---------------------------------|
| Autoavaliação CF        | `/ciclos/cf/:id/autoavaliacao`        | Abaixo do campo de texto        |
| Avaliação PDM CF        | `/meu-time/:colaboradorId/cf/:id/avaliar` | Abaixo de cada campo de texto |
| Avaliação convidado CF  | `/avaliar/cf/:token`                  | Abaixo do campo de texto        |

### Diagrama de navegação

```
[Qualquer formulário CF com campo de texto]
  └── [campo perde foco ou submit acionado]
        ├── [conteúdo insuficiente] → alerta inline exibido abaixo do campo
        │     ├── [avaliador edita] → alerta atualizado ou removido
        │     └── [avaliador ignora e submete] → submissão aceita normalmente
        └── [conteúdo adequado] → sem alerta
```

### Entrada na navegação

Nenhuma. Este componente é parte dos formulários de CF e não tem entrada própria no menu lateral.
