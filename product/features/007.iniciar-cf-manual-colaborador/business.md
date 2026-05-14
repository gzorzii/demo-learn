# Iniciar CF Manual pelo Próprio Colaborador

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o próprio colaborador inicie um ciclo de Continuous Feedback quando não houver CF ou PR ativo e estiver fora do período de blackout, dando autonomia ao colaborador para solicitar feedback no momento que considerar mais oportuno.

---

## Atores envolvidos

- **Colaborador:** único ator que inicia o ciclo por esta via; age sobre si mesmo
- **PDM:** recebe notificação quando o ciclo é aberto pelo colaborador

---

## Regras de negócio

- (Regra 6) CF pode ser iniciado manualmente pelo próprio colaborador quando não houver CF/PR ativo e estiver fora do blackout.
- (Regra 8) CF manual: a sujeita (colaborador) pode encerrar o ciclo manualmente.
- (Regra 4) CF e PR nunca correm em paralelo para a mesma sujeita; o colaborador não pode abrir CF se houver PR ativo.
- (Regra 19) Novos CFs não podem abrir durante o blackout de PR.
- (Regra 13) CF manual não tem restrição de tenure.
- (Regra 12) Encerramento também pode ocorrer automaticamente após 10 dias de coleta ou 100% das respostas obrigatórias.
- Ao iniciar, o sistema notifica o PDM do colaborador.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado não possui CF ou PR ativo
E não está em blackout de PR
Quando o colaborador aciona "Iniciar CF"
Então o sistema cria um ciclo CF do tipo "manual-colaborador" para esse colaborador
E envia notificação ao PDM
E o ciclo aparece imediatamente na visão de ciclos ativos do colaborador

Dado que um colaborador já possui um ciclo de CF ativo
Quando o colaborador tenta iniciar um novo CF
Então o sistema exibe mensagem de impedimento informando que já existe um CF ativo

Dado que um colaborador possui um ciclo de PR ativo
Quando o colaborador tenta iniciar CF
Então o sistema exibe mensagem de impedimento informando que PR está ativo

Dado que um colaborador está em blackout de PR
Quando o colaborador tenta iniciar CF
Então o sistema exibe mensagem de impedimento informando que o período de blackout está ativo
E informa a data prevista de encerramento do blackout (se disponível)
```

---

## Quem pode acessar

Apenas colaboradores autenticados, desde que atendam às condições: sem CF ou PR ativo e fora do período de blackout. O sistema deve ocultar ou desabilitar a ação quando o colaborador não é elegível.

---

## Fora de escopo

- CF automático (trimestral, onboarding) — tratado em `004`
- CF por evento — tratado em `005`
- CF iniciado pelo PDM — tratado em `006`
- Configuração de parâmetros do ciclo pelo colaborador (cadência, prazo)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela               | Rota       | Propósito                                                          |
|--------------------|------------|--------------------------------------------------------------------|
| Ação "Iniciar CF"  | `/ciclos`  | Botão de ação dentro da tela de ciclos ativos para iniciar CF      |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /ciclos  (003.visao-ciclos-ativos)
        └── [sem ciclo ativo + elegível] → botão "Iniciar CF"
              ├── [confirmar] → cria ciclo CF → notifica PDM → /ciclos (exibe ciclo criado)
              └── [cancelar] → /ciclos
        └── [inelegível] → botão "Iniciar CF" desabilitado com tooltip explicativo
```

### Entrada na navegação

A ação "Iniciar CF" é um botão contextual dentro da tela `/ciclos`, disponível no menu lateral para o perfil **Colaborador**. Quando o colaborador não é elegível, o botão é desabilitado com mensagem explicativa.
