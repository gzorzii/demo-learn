# Iniciar CF por Evento (Mudança de Projeto / Promoção / Cliente)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Iniciar automaticamente um ciclo de Continuous Feedback (CF) quando o sistema detecta uma mudança relevante no perfil do colaborador — mudança de projeto, promoção ou mudança de cliente. Garante que transições de carreira ou alocação sejam acompanhadas por um ciclo de feedback contextualizado no período recente.

---

## Atores envolvidos

- **Sistema (event listener):** único ator que dispara o ciclo; nenhuma persona humana inicia manualmente
- **Colaborador:** sujeita do ciclo; recebe notificação quando o ciclo é aberto
- **PDM:** recebe notificação quando um ciclo de CF do seu liderado é aberto por evento

---

## Regras de negócio

- (Regra 6) CF pode ser iniciado por gatilho de evento: mudança de projeto, promoção ou mudança de cliente.
- (Regra 7) CF iniciado por evento tem todas as transições controladas pelo sistema; o colaborador não pode encerrar manualmente.
- (Regra 13) CF por evento não tem restrição de tenure.
- (Regra 19) Novos CFs não podem abrir durante o blackout de PR; o evento é ignorado se o colaborador estiver em blackout.
- (Regra 4) CF e PR nunca correm em paralelo para a mesma sujeita; o evento é ignorado se houver PR ativo.
- (Regra 12) Encerramento automático: após 10 dias de coleta OU 100% das respostas obrigatórias.
- Ao iniciar o ciclo, o sistema envia notificação ao colaborador e ao seu PDM.
- Caso o colaborador já possua um CF ativo (seja automático, por evento ou manual) quando o evento ocorre, o evento é descartado ou enfileirado — regra a confirmar com stakeholder.

---

## Critérios de aceite

```gherkin
Dado que o sistema detecta uma mudança de projeto para um colaborador
E o colaborador não está em blackout de PR
E não há CF ou PR ativo para esse colaborador
Quando o evento é processado
Então o sistema cria um ciclo CF do tipo "evento" para o colaborador
E registra o motivo do evento (mudança de projeto)
E envia notificação ao colaborador e ao PDM

Dado que o sistema detecta uma promoção para um colaborador
E o colaborador não está em blackout de PR
E não há CF ou PR ativo para esse colaborador
Quando o evento é processado
Então o sistema cria um ciclo CF do tipo "evento" para o colaborador
E registra o motivo do evento (promoção)
E envia notificação ao colaborador e ao PDM

Dado que o sistema detecta uma mudança de cliente para um colaborador
E o colaborador não está em blackout de PR
E não há CF ou PR ativo para esse colaborador
Quando o evento é processado
Então o sistema cria um ciclo CF do tipo "evento" para o colaborador
E registra o motivo do evento (mudança de cliente)
E envia notificação ao colaborador e ao PDM

Dado que um colaborador está em blackout de PR
Quando um evento de mudança de projeto é detectado para esse colaborador
Então o sistema não cria um novo CF
E registra o evento como ignorado por blackout

Dado que um colaborador possui um ciclo de PR ativo
Quando um evento de promoção é detectado para esse colaborador
Então o sistema não cria um novo CF

Dado que um CF de evento está ativo para um colaborador
E o colaborador tenta encerrar o ciclo manualmente
Quando a ação é executada
Então o sistema rejeita a ação com mensagem explicando que ciclos por evento não podem ser encerrados manualmente
```

---

## Quem pode acessar

Esta feature não tem interface de usuário para disparo — é exclusiva do sistema (event listener). O colaborador e o PDM têm acesso somente leitura ao ciclo gerado, via `003.visao-ciclos-ativos`.

---

## Fora de escopo

- CF trimestral e de onboarding (tratados em `004`)
- CF iniciado manualmente por PDM ou colaborador (tratados em `006` e `007`)
- Configuração de quais eventos disparam CF (administrado no nível de sistema)
- Integração em tempo real com sistemas externos de RH (fase 2)

---

## Fluxo de telas

Esta feature não introduz telas próprias — é exclusivamente de backend/sistema.

O colaborador e o PDM percebem o início do ciclo por meio de:
1. Notificação recebida (Google Chat — apenas notificação, não coleta)
2. Aparecimento do ciclo em `/ciclos` (`003.visao-ciclos-ativos`)

### Diagrama de navegação

```
Sistema (event listener — sem UI)
  ├── [mudança de projeto detectada] → cria CF tipo "evento" → notifica colaborador e PDM
  ├── [promoção detectada] → cria CF tipo "evento" → notifica colaborador e PDM
  └── [mudança de cliente detectada] → cria CF tipo "evento" → notifica colaborador e PDM

Colaborador / PDM (após notificação)
  └── /ciclos  (003.visao-ciclos-ativos) → ciclo aparece na lista de ativos
```

### Entrada na navegação

Nenhuma entrada no menu lateral — feature exclusiva de sistema. O ciclo criado aparece automaticamente na tela `/ciclos`.

---

## Questões em aberto

- O que acontece quando um evento ocorre e o colaborador já possui um CF ativo? O evento é descartado silenciosamente, enfileirado para após o encerramento, ou gera um alerta para o PDM?
- Qual é a fonte de dados de eventos de mudança (sistema de RH interno, planilha, API externa)?
