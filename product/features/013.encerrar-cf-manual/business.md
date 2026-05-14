# Encerrar CF Manual pela Sujeita

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador encerre antecipadamente um ciclo de Continuous Feedback iniciado manualmente (por ele mesmo ou pelo PDM), quando considerar que o feedback coletado é suficiente antes do prazo de 10 dias.

---

## Atores envolvidos

- **Colaborador:** único ator que pode encerrar manualmente um ciclo de CF manual

---

## Regras de negócio

- (Regra 8) CF manual: somente a sujeita (colaborador) pode encerrar o ciclo manualmente.
- (Regra 7) CF de sistema (automático ou por evento): o colaborador não pode encerrar — apenas o cron controla o encerramento.
- (Regra 12) Ciclos também podem encerrar automaticamente por prazo de 10 dias ou 100% das respostas obrigatórias, independentemente do encerramento manual.
- O encerramento manual é irreversível — não é possível reabrir um ciclo encerrado.
- O sistema deve solicitar confirmação antes de processar o encerramento.
- Após o encerramento, o colaborador é redirecionado para o resumo do ciclo e o PDM é notificado.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um CF do tipo "manual-colaborador" ou "manual-pdm" ativo
Quando o colaborador acessa a tela de progresso do CF
Então visualiza a opção de encerrar o ciclo manualmente

Dado que o colaborador aciona "Encerrar CF"
Quando a ação é acionada
Então o sistema exibe modal de confirmação com aviso de que a ação é irreversível

Dado que o colaborador confirma o encerramento
Quando a confirmação é registrada
Então o ciclo CF é encerrado
E o colaborador é redirecionado para o resumo do ciclo (014)
E o PDM recebe notificação de encerramento

Dado que o colaborador cancela o encerramento no modal de confirmação
Quando cancela
Então retorna à tela de progresso sem alterações

Dado que o colaborador possui um CF do tipo "trimestral", "onboarding" ou "evento" ativo
Quando acessa a tela de progresso
Então a opção de encerrar manualmente não é exibida (ou está desabilitada com explicação)

Dado que um CF já foi encerrado automaticamente
Quando o colaborador tenta encerrar manualmente
Então o sistema informa que o ciclo já está encerrado
```

---

## Quem pode acessar

Apenas o colaborador autenticado que é a sujeita de um CF do tipo manual (iniciado por ele próprio via `007` ou pelo PDM via `006`), enquanto o ciclo estiver ativo.

---

## Fora de escopo

- Encerramento de ciclos automáticos (cron / evento) — controlado exclusivamente pelo sistema
- Encerramento de ciclos de PR — PR não tem encerramento manual pela sujeita
- Reabertura de ciclos encerrados
- Encerramento pelo PDM (o PDM não tem poder de encerrar o CF — apenas a sujeita)

---

## Fluxo de telas

### Telas introduzidas por esta feature

Esta feature não introduz tela nova — a ação de encerramento está disponível na tela de progresso do CF (`012.acompanhar-progresso-cf`), acessível em `/ciclos/cf/:id`.

| Elemento           | Localização             | Propósito                                           |
|--------------------|-------------------------|-----------------------------------------------------|
| Botão "Encerrar"   | `/ciclos/cf/:id`        | Ação disponível apenas para CF manual               |
| Modal confirmação  | `/ciclos/cf/:id`        | Confirma o encerramento irreversível                |

### Diagrama de navegação

```
/ciclos/cf/:id  (012.acompanhar-progresso-cf — CF manual ativo)
  └── [botão "Encerrar CF"] → modal de confirmação
        ├── [confirmar] → ciclo encerrado → notifica PDM → /ciclos/cf/:id/resumo (014)
        └── [cancelar] → /ciclos/cf/:id (sem alterações)
```

### Entrada na navegação

Não há entrada nova no menu lateral. A ação é um botão contextual na tela de progresso `/ciclos/cf/:id`, exibida somente quando o ciclo é do tipo manual e o usuário autenticado é a sujeita.
