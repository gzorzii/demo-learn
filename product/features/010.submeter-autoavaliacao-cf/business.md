# Submeter Autoavaliação do Colaborador no CF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador (sujeita) preencha e submeta sua autoavaliação no ciclo de Continuous Feedback, respondendo com texto aberto sobre seu próprio desempenho no período recente. A autoavaliação é obrigatória mas não conta para a nota final.

---

## Atores envolvidos

- **Colaborador:** único ator que preenche e submete a autoavaliação do CF

---

## Regras de negócio

- (Regra 9) Autoavaliação (self) é obrigatória no CF.
- (Regra 3) Autoavaliação não conta para a nota final do ciclo.
- (Regra 4) CF tem foco no período recente; formulário é curto e fácil de responder.
- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes; sem follow-up ativo.
- (Regra 33) IA verifica cobertura mínima de ~70% das skills/dimensões e exemplos específicos.
- O colaborador pode preencher e submeter a autoavaliação a qualquer momento durante a fase de coleta.
- Após submissão, a autoavaliação não pode ser alterada.
- O formulário do CF é de texto aberto — sem escala numérica para a autoavaliação.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um CF ativo na fase de coleta
Quando acessa o formulário de autoavaliação
Então visualiza o campo de texto aberto para preencher sua autoavaliação

Dado que o colaborador está preenchendo a autoavaliação
E o texto tem detalhes insuficientes (cobertura < 70% das dimensões)
Quando o campo perde foco ou o colaborador tenta submeter
Então a IA exibe alerta inline sugerindo que a resposta seja mais específica
E o colaborador pode revisar antes de confirmar

Dado que o colaborador preencheu a autoavaliação com conteúdo adequado
Quando o colaborador submete
Então o sistema registra a autoavaliação
E exibe confirmação de envio
E atualiza o progresso do ciclo

Dado que o colaborador já submeteu a autoavaliação
Quando acessa novamente o formulário
Então o sistema exibe a resposta já enviada em modo somente leitura
E não permite edição

Dado que o ciclo CF ainda não atingiu a fase de coleta
Quando o colaborador tenta acessar o formulário de autoavaliação
Então o sistema informa que a coleta ainda não foi aberta
```

---

## Quem pode acessar

Apenas o colaborador autenticado que é a sujeita do ciclo CF ativo, durante a fase de coleta.

---

## Fora de escopo

- Autoavaliação no PR (formulário distinto com dimensões D1/D2/D3 e escala numérica — tratado em `019`)
- Avaliação de pares ou PDM no CF (tratados em `009` e `011`)
- Edição da autoavaliação após submissão

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                  | Rota                              | Propósito                                                   |
|-----------------------|-----------------------------------|-------------------------------------------------------------|
| Autoavaliação CF      | `/ciclos/cf/:id/autoavaliacao`    | Formulário de autoavaliação do colaborador no ciclo CF      |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos)
  └── [CF ativo — fase: coleta] → /ciclos/cf/:id/autoavaliacao
        ├── [autoavaliação não submetida] → formulário de texto aberto
        │     ├── [IA alerta — conteúdo insuficiente] → alerta inline → continuar editando
        │     ├── [submeter] → confirmação → /ciclos/cf/:id (progresso atualizado)
        │     └── [sair sem submeter] → rascunho mantido → /ciclos
        └── [autoavaliação já submetida] → modo somente leitura
```

### Entrada na navegação

A autoavaliação é acessada a partir do card do CF ativo em `/ciclos` (003.visao-ciclos-ativos), visível para o perfil **Colaborador**. A tela aparece como uma ação pendente quando a fase de coleta está ativa.
