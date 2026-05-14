# Iniciar PR Automático pelo Sistema (Pré-condições e Blackout)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Iniciar automaticamente o ciclo de Performance Review para colaboradores elegíveis no quarter definido para o seu grupo, verificando todas as pré-condições (blackout ativo, tenure mínimo de 6 meses) e registrando o início formal do ciclo anual de avaliação de desempenho.

---

## Atores envolvidos

- **Sistema:** único ator que dispara e controla o ciclo de PR; nenhuma persona humana inicia manualmente
- **Colaborador:** sujeita do ciclo; recebe notificação quando o PR é aberto
- **PDM:** recebe notificação quando o PR de um liderado é iniciado

---

## Regras de negócio

- (Regra 16) PR é anual por colaborador; empresa dividida em 4 grupos, cada grupo roda no quarter definido pelo Admin.
- (Regra 17) Após o quarter de PR, os 3 quarters seguintes do colaborador são de CF.
- (Regra 18) PR é automático; nenhuma persona pode iniciar manualmente. Pré-condições: blackout de CF ativo e mínimo de 6 meses de empresa da sujeita.
- (Regra 19) Blackout: mês imediatamente anterior ao PR + período do PR. Novos CFs não podem abrir durante o blackout; CFs já iniciados antes do blackout podem continuar até fechar.
- (Regra 20) Prazo do PR: 1 mês para concluir todas as etapas.
- (Regra 4) CF e PR nunca correm em paralelo; o sistema não abre PR se houver CF ativo para a sujeita.
- (Regra 24) Se ninguém adicionar convidados e o PDM não selecionar modelo, o sistema adiciona 5 peers automaticamente.
- Ao iniciar, o sistema envia notificação ao colaborador e ao PDM.
- Colaboradores com menos de 6 meses de empresa no momento do quarter são pulados — não recebem PR nesse ciclo.

---

## Critérios de aceite

```gherkin
Dado que o quarter de PR de um grupo é iniciado
E um colaborador do grupo possui mais de 6 meses de empresa
E não há CF ativo para esse colaborador
Quando o sistema processa o início do quarter
Então o ciclo PR é criado para o colaborador
E o blackout é ativado (novos CFs bloqueados)
E colaborador e PDM são notificados
E o prazo de 1 mês é iniciado

Dado que o quarter de PR de um grupo é iniciado
E um colaborador do grupo possui menos de 6 meses de empresa
Quando o sistema processa o início do quarter
Então o ciclo PR não é criado para esse colaborador

Dado que o quarter de PR de um grupo é iniciado
E um colaborador possui um CF ativo no momento
Quando o sistema processa o início do quarter
Então o ciclo PR não é aberto até que o CF ativo seja encerrado
E o blackout é ativado (não inicia novo CF) assim que o quarter começa

Dado que um PDM ou colaborador tenta iniciar PR manualmente
Quando a ação é executada
Então o sistema rejeita a operação com mensagem informando que PR é exclusivamente automático

Dado que um CF foi iniciado antes do período de blackout
Quando o blackout de PR é ativado
Então o CF existente continua ativo até seu encerramento natural

Dado que 1 mês se passou sem que todas as etapas do PR fossem concluídas
Quando o prazo expira
Então o sistema registra o status de prazo expirado para o ciclo
```

---

## Quem pode acessar

Esta feature não tem interface de usuário para disparo — é exclusiva do sistema. O colaborador e o PDM têm acesso somente leitura ao ciclo gerado, via `003.visao-ciclos-ativos`.

---

## Fora de escopo

- Criação e configuração de grupos e quarters (tratado em `025`)
- PR iniciado manualmente (não permitido em nenhuma hipótese)
- Validação de avaliadores no PR (tratado em `017`)

---

## Fluxo de telas

Esta feature não introduz telas próprias — é exclusivamente de backend/sistema.

O colaborador e o PDM percebem o início do ciclo por meio de:
1. Notificação recebida (Google Chat — apenas notificação)
2. Aparecimento do ciclo em `/ciclos` (`003.visao-ciclos-ativos`)

### Diagrama de navegação

```
Sistema (scheduler — sem UI)
  └── [quarter de PR iniciado] → verifica elegibilidade de cada colaborador do grupo
        ├── [elegível: tenure ≥ 6 meses + sem CF ativo] → cria ciclo PR → notifica colaborador e PDM
        ├── [inelegível: tenure < 6 meses] → pula colaborador
        └── [CF ativo presente] → ativa blackout + aguarda encerramento do CF

Colaborador / PDM (após notificação)
  └── /ciclos  (003.visao-ciclos-ativos) → ciclo PR aparece na lista de ativos
```

### Entrada na navegação

Nenhuma entrada no menu lateral — feature exclusiva de sistema. O ciclo criado aparece automaticamente na tela `/ciclos`.
