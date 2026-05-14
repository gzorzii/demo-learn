# Iniciar CF Automático (Trimestral e Onboarding via Cron)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Iniciar automaticamente ciclos de Continuous Feedback (CF) para colaboradores elegíveis por meio de cron jobs do sistema, cobrindo duas cadências distintas: trimestral (a cada 3 meses) e onboarding (aos 30 e aos 90 dias de empresa). Garante que nenhum colaborador fique sem ciclo de feedback ativo por omissão humana.

---

## Atores envolvidos

- **Sistema (cron):** único ator que dispara e controla o ciclo; nenhuma persona humana inicia ou encerra manualmente
- **Colaborador:** sujeita do ciclo; recebe notificação quando o ciclo é aberto
- **PDM:** recebe notificação quando um ciclo de CF do seu liderado é aberto

---

## Regras de negócio

- (Regra 6) CF pode ser iniciado por cron do sistema em cadência trimestral ou por onboarding.
- (Regra 7) CF de sistema tem todas as transições de estado controladas pelo cron; o colaborador não pode encerrar manualmente este tipo de ciclo.
- (Regra 13) CF não tem restrição de tenure (os 6 meses mínimos aplicam-se apenas ao PR).
- (Regra 14) Onboarding: coletas forçadas aos exatos 30 e 90 dias de empresa da sujeita — gatilho independente do trimestral.
- (Regra 19) Novos CFs não podem abrir durante o blackout de PR; CFs já iniciados antes do blackout podem continuar.
- (Regra 4) CF e PR nunca correm em paralelo para a mesma sujeita; o cron não abre CF se houver PR ativo.
- (Regra 12) Encerramento automático: após 10 dias de coleta OU 100% das respostas obrigatórias.
- Ao iniciar o ciclo, o sistema envia notificação ao colaborador e ao seu PDM.
- O cron verifica diariamente as condições de abertura; colaboradores que atendem a mais de um gatilho no mesmo dia recebem apenas um ciclo.

---

## Critérios de aceite

```gherkin
Dado que o cron de CF trimestral é executado
E um colaborador está fora do blackout de PR
E não há CF ou PR ativo para esse colaborador
Quando as condições de abertura trimestral são satisfeitas
Então o sistema cria um ciclo CF do tipo "trimestral" para o colaborador
E envia notificação ao colaborador e ao PDM

Dado que o cron de onboarding é executado
E um colaborador completou exatamente 30 dias de empresa
Quando o gatilho de onboarding é avaliado
Então o sistema cria um ciclo CF do tipo "onboarding-30d" para o colaborador
E envia notificação ao colaborador e ao PDM

Dado que o cron de onboarding é executado
E um colaborador completou exatamente 90 dias de empresa
Quando o gatilho de onboarding é avaliado
Então o sistema cria um ciclo CF do tipo "onboarding-90d" para o colaborador
E envia notificação ao colaborador e ao PDM

Dado que um colaborador possui um ciclo de PR ativo
Quando o cron de CF trimestral é executado para esse colaborador
Então o sistema não cria um novo ciclo CF para esse colaborador

Dado que um colaborador está no período de blackout de PR
Quando o cron de CF trimestral é executado
Então o sistema não abre um novo CF para esse colaborador

Dado que um colaborador possui um CF de sistema ativo
Quando o colaborador tenta encerrar o ciclo manualmente
Então o sistema rejeita a ação com mensagem explicando que ciclos automáticos não podem ser encerrados manualmente

Dado que o cron detecta que 10 dias de coleta foram completados num CF automático
Quando o prazo expira
Então o sistema encerra o ciclo automaticamente

Dado que 100% das respostas obrigatórias de um CF automático foram coletadas antes dos 10 dias
Quando a última resposta obrigatória é registrada
Então o sistema encerra o ciclo automaticamente
```

---

## Quem pode acessar

Esta feature não tem interface de usuário para disparo — é exclusiva do sistema (cron). O colaborador e o PDM têm acesso somente leitura ao ciclo gerado, via `003.visao-ciclos-ativos`.

---

## Fora de escopo

- Disparo manual de CF por humanos (tratado em `006` e `007`)
- CF iniciado por evento de mudança de perfil (tratado em `005`)
- Configuração da cadência trimestral por usuário (administrado no nível de sistema/deploy)
- Interface de monitoramento dos cron jobs pelo Admin

---

## Fluxo de telas

Esta feature não introduz telas próprias — é exclusivamente de backend/sistema.

O colaborador e o PDM percebem o início do ciclo por meio de:
1. Notificação recebida (Google Chat — apenas notificação, não coleta)
2. Aparecimento do ciclo em `/ciclos` (`003.visao-ciclos-ativos`)

### Diagrama de navegação

```
Sistema (cron — sem UI)
  ├── [trimestral] → cria CF tipo "trimestral" → notifica colaborador e PDM
  ├── [onboarding-30d] → cria CF tipo "onboarding-30d" → notifica colaborador e PDM
  └── [onboarding-90d] → cria CF tipo "onboarding-90d" → notifica colaborador e PDM

Colaborador / PDM (após notificação)
  └── /ciclos  (003.visao-ciclos-ativos) → ciclo aparece na lista de ativos
```

### Entrada na navegação

Nenhuma entrada no menu lateral — feature exclusiva de sistema. O ciclo criado aparece automaticamente na tela `/ciclos`.
