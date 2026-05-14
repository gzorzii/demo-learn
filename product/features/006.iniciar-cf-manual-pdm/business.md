# Iniciar CF Manual pelo PDM para um Liderado

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM inicie manualmente um ciclo de Continuous Feedback para um liderado específico, fora da cadência automática, quando identificar necessidade de feedback contextualizado que não se enquadra nos gatilhos automáticos do sistema.

---

## Atores envolvidos

- **PDM:** único ator que inicia o ciclo por esta via; age sobre um liderado específico
- **Colaborador:** sujeita do ciclo; recebe notificação quando o ciclo é aberto pelo PDM

---

## Regras de negócio

- (Regra 6) CF pode ser iniciado manualmente pelo PDM para o seu liderado.
- (Regra 8) CF manual: a sujeita (colaborador) pode encerrar o ciclo manualmente.
- (Regra 4) CF e PR nunca correm em paralelo para a mesma sujeita; o PDM não pode abrir CF se houver PR ativo para o liderado.
- (Regra 19) Novos CFs não podem abrir durante o blackout de PR.
- (Regra 13) CF manual não tem restrição de tenure.
- (Regra 12) Encerramento também pode ocorrer automaticamente após 10 dias de coleta ou 100% das respostas obrigatórias.
- O PDM só pode iniciar CF manual para colaboradores que são seus liderados diretos.
- Ao iniciar, o sistema envia notificação ao colaborador.

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado acessa a lista de seus liderados
E um liderado específico não possui CF ou PR ativo
E o liderado não está em blackout de PR
Quando o PDM aciona "Iniciar CF" para esse liderado
Então o sistema cria um ciclo CF do tipo "manual-pdm" para o colaborador
E envia notificação ao colaborador
E o ciclo aparece na visão de ciclos ativos do colaborador

Dado que um liderado possui um ciclo de CF ativo
Quando o PDM tenta iniciar um novo CF para esse liderado
Então o sistema exibe mensagem de impedimento informando que já existe um CF ativo

Dado que um liderado possui um ciclo de PR ativo
Quando o PDM tenta iniciar um CF para esse liderado
Então o sistema exibe mensagem de impedimento informando que PR está ativo

Dado que o liderado está em blackout de PR
Quando o PDM tenta iniciar CF para esse liderado
Então o sistema exibe mensagem de impedimento informando que o período de blackout está ativo

Dado que um PDM tenta iniciar CF para um colaborador que não é seu liderado
Quando a ação é executada
Então o sistema rejeita a operação com mensagem de acesso negado
```

---

## Quem pode acessar

Apenas PDMs autenticados. A ação é restrita a colaboradores que fazem parte da lista de liderados diretos do PDM autenticado.

---

## Fora de escopo

- CF automático (trimestral, onboarding) — tratado em `004`
- CF por evento — tratado em `005`
- CF iniciado pelo próprio colaborador — tratado em `007`
- Gestão da lista de liderados do PDM (dado pré-existente no sistema)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                  | Rota                           | Propósito                                               |
|-----------------------|--------------------------------|---------------------------------------------------------|
| Ação "Iniciar CF"     | `/meu-time` (botão contextual) | Modal ou confirmação inline para iniciar CF do liderado |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /meu-time  ← lista de liderados do PDM
        └── [card de liderado] → botão "Iniciar CF"
              ├── [liderado elegível] → modal de confirmação
              │     ├── [confirmar] → cria ciclo CF → notifica colaborador → /meu-time
              │     └── [cancelar] → /meu-time
              └── [liderado inelegível] → mensagem de impedimento inline
```

### Entrada na navegação

O PDM acessa esta ação a partir da tela `/meu-time`, disponível no menu lateral para o perfil **PDM**. A ação "Iniciar CF" é um botão ou opção contextual no card de cada liderado.
