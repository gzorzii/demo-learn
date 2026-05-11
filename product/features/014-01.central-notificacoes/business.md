# Central de Notificações

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Gerentes e Caixas visualizem, leiam e dispensem notificações in-app diretamente no header do sistema, por meio de um ícone de sino. A central exibe todas as notificações não lidas do usuário autenticado em uma lista unificada, independente do tipo (`book_arrival` ou `shelf_overdue`). O objetivo é garantir que eventos relevantes — chegada de livro desejado por um cliente e vencimento de prazo de prateleira — cheguem de forma proativa ao operador sem exigir navegação entre módulos.

## Atores envolvidos

- **Gerente** — visualiza e gerencia notificações dos tipos `book_arrival` e `shelf_overdue` da própria filial.
- **Caixa** — visualiza e gerencia notificações do tipo `book_arrival` da própria filial.
- **Administrador** — visualiza e gerencia notificações do tipo `shelf_overdue` quando operar no contexto de uma filial.

## Regras de negócio

1. O ícone de sino é exibido no header em todas as telas autenticadas, para os perfis **Gerente**, **Caixa** e **Administrador** (conforme tabela de permissões em `000-03.home-navegacao`).
2. Quando o usuário possui ao menos uma notificação com `read = false`, o sino exibe um indicador visual (badge com contagem ou ponto colorido).
3. Clicar no sino abre um painel (dropdown ou flyout) sobreposto à tela atual, sem navegar para outra rota.
4. O painel exibe a lista de notificações não lidas (`read = false`) do usuário autenticado, ordenada da mais recente para a mais antiga.
5. Cada item da lista exibe: tipo da notificação em linguagem natural, mensagem descritiva, e data/hora de criação.
6. O usuário pode marcar uma notificação individualmente como lida — o item sai imediatamente da lista.
7. O usuário pode dispensar (dismiss) uma notificação individualmente — comportamento equivalente a marcar como lida: `read` é definido como `true` e o item sai da lista.
8. O usuário pode marcar todas as notificações visíveis como lidas de uma só vez ("marcar todas como lidas").
9. Quando não há notificações não lidas, o painel exibe uma mensagem informativa ("Nenhuma notificação") e o badge não é exibido.
10. Apenas notificações destinadas ao `user_id` do usuário autenticado são exibidas — nunca notificações de outros usuários.
11. A contagem do badge e a lista são atualizadas sem recarregar a página; a frequência e o mecanismo de atualização (polling, SSE, websocket) são decisão de implementação técnica.
12. Notificações com `read = true` não são exibidas no painel — não existe tela de histórico de notificações lidas neste escopo.

## Critérios de aceite

```gherkin
Funcionalidade: Central de notificações — visualização e interação

  Cenário: Badge exibido quando há notificações não lidas
    Dado que o usuário autenticado possui o perfil "Gerente"
    E existem 3 notificações com "read = false" destinadas a ele
    Quando acessa qualquer tela do sistema
    Então o ícone de sino no header exibe um indicador com a contagem "3"

  Cenário: Badge não exibido quando não há notificações não lidas
    Dado que o usuário autenticado não possui notificações com "read = false"
    Quando acessa qualquer tela do sistema
    Então o ícone de sino não exibe indicador de contagem

  Cenário: Painel abre ao clicar no sino
    Dado que o usuário autenticado possui notificações não lidas
    Quando clica no ícone de sino no header
    Então um painel é exibido sobreposto à tela atual
    E a lista de notificações não lidas é apresentada, da mais recente para a mais antiga
    E a tela de fundo permanece visível e inalterada

  Cenário: Conteúdo de uma notificação book_arrival
    Dado que existe uma notificação do tipo "book_arrival" para o usuário autenticado
    Quando o painel de notificações é aberto
    Então o item exibe o tipo "Livro desejado disponível" (ou equivalente legível)
    E exibe a mensagem descritiva e a data/hora de criação

  Cenário: Conteúdo de uma notificação shelf_overdue
    Dado que existe uma notificação do tipo "shelf_overdue" para o usuário autenticado
    Quando o painel de notificações é aberto
    Então o item exibe o tipo "Livro vencido na prateleira" (ou equivalente legível)
    E exibe a mensagem descritiva e a data/hora de criação

  Cenário: Marcar notificação individual como lida
    Dado que o painel de notificações está aberto
    E exibe a notificação "N" com "read = false"
    Quando o usuário clica em "Marcar como lida" na notificação "N"
    Então o campo "read" da notificação "N" é definido como "true"
    E a notificação "N" é removida imediatamente da lista visível
    E a contagem do badge é decrementada

  Cenário: Dispensar (dismiss) notificação individual
    Dado que o painel de notificações está aberto
    E exibe a notificação "N" com "read = false"
    Quando o usuário clica em "Dispensar" na notificação "N"
    Então o campo "read" da notificação "N" é definido como "true"
    E a notificação "N" é removida imediatamente da lista visível

  Cenário: Marcar todas as notificações como lidas
    Dado que o painel exibe 4 notificações não lidas
    Quando o usuário clica em "Marcar todas como lidas"
    Então o campo "read" de todas as 4 notificações é definido como "true"
    E a lista fica vazia
    E o badge do sino deixa de ser exibido

  Cenário: Painel vazio quando sem notificações não lidas
    Dado que o usuário autenticado não possui notificações com "read = false"
    Quando clica no ícone de sino
    Então o painel exibe a mensagem "Nenhuma notificação"
    E o badge não está visível

  Cenário: Caixa não visualiza notificações shelf_overdue
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    E existem notificações do tipo "shelf_overdue" destinadas a ele
    Então nenhuma notificação do tipo "shelf_overdue" é criada para o Caixa (regra de geração em 014-00)
    E o painel exibe apenas notificações do tipo "book_arrival"

  Cenário: Perfil sem acesso ao sino
    Dado que o usuário autenticado possui apenas o perfil "Catalogador"
    Quando acessa qualquer tela do sistema
    Então o ícone de sino não é exibido no header
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente**, **Caixa** ou **Administrador**. O ícone de sino e o painel de notificações não são exibidos para o perfil **Catalogador**.

## Fora de escopo

- Geração das notificações — responsabilidade de `014-00.notificacoes`.
- Histórico de notificações já lidas (tela ou filtro de notificações com `read = true`).
- Configuração de preferências de notificação pelo usuário (habilitar/desabilitar tipos).
- Entrega por canal externo: e-mail, SMS, WhatsApp ou push mobile.
- Navegação automática para o livro relacionado ao clicar em uma notificação (possível melhoria futura).
- Paginação da lista (assume-se volume gerenciável; sem definição de limite de itens exibidos neste escopo).

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Painel de notificações (sino) | Sem rota própria — painel sobreposto ao header | Exibir lista de notificações não lidas e permitir marcação como lida ou dispensa |

Esta feature não introduz uma rota nova. O painel é um componente do header acessível globalmente em todas as rotas autenticadas.

### Diagrama de navegação

```
[qualquer rota autenticada]
  └── [clicar no ícone de sino no header]
        └── painel de notificações (overlay)
              ├── [marcar notificação como lida] → permanece no painel (item removido da lista)
              ├── [dispensar notificação] → permanece no painel (item removido da lista)
              ├── [marcar todas como lidas] → painel exibe estado vazio
              └── [clicar fora do painel ou fechar] → fecha o painel; rota atual inalterada
```

### Entrada de navegação

O acesso se dá pelo ícone de sino fixo no header, visível em todas as telas autenticadas para os perfis **Gerente**, **Caixa** e **Administrador**. A entrada já consta na tabela de permissões de `000-03.home-navegacao` (linha "Notificações"), com acesso permitido para Administrador, Gerente e Caixa.
