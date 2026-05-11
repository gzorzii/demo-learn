# Notificações

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Feature de infraestrutura de módulo — não é uma feature de negócio diretamente acionável pelo usuário.

Define o contrato do módulo de notificações in-app do sistema: a tabela `notification`, os tipos de notificação suportados, as regras de geração e as responsabilidades dos produtores e consumidores de notificações. Este módulo é o ponto de referência normativo para qualquer feature que precise gerar ou exibir notificações.

O objetivo de negócio é alertar os usuários sobre eventos relevantes que ocorrem no sistema sem exigir que eles consultem ativamente cada módulo — chegada de livro desejado por cliente e vencimento de prazo de prateleira de livro.

## Atores envolvidos

- **Gerente** — destinatário de notificações do tipo `shelf_overdue` (livro vencido na prateleira da própria filial) e `book_arrival` (livro desejado chegou ao estoque da própria filial).
- **Caixa** — destinatário de notificações do tipo `book_arrival` da própria filial.
- **Administrador** — destinatário de notificações do tipo `shelf_overdue` quando estiver operando no contexto de uma filial.
- **Sistema (job agendado)** — produtor de notificações do tipo `shelf_overdue`; disparado automaticamente quando um livro ultrapassa o prazo configurado em `shelf_threshold`.
- **Sistema (cadastro de livro)** — produtor de notificações do tipo `book_arrival`; disparado ao salvar um novo livro que corresponde a item da `customer_wishlist`.

## Regras de negócio

1. A tabela `notification` (definida em `000-01.modelagem-dados`) é a única fonte de verdade para notificações in-app; nenhuma outra tabela ou mecanismo de estado é utilizado.
2. Dois tipos de notificação são suportados neste escopo:
   - `book_arrival` — gerado quando um livro cadastrado em `001-01.cadastrar-livro` corresponde (por título, autor ou ISBN) a um item da `customer_wishlist` da mesma filial.
   - `shelf_overdue` — gerado pelo job agendado que verifica livros cujo `registered_at` ultrapassa o prazo configurado em `shelf_threshold` da filial.
3. Destinatários da notificação `book_arrival`: todos os usuários da filial com perfil **Gerente** ou **Caixa** ativos no momento da geração.
4. Destinatários da notificação `shelf_overdue`: todos os usuários da filial com perfil **Gerente** ativos no momento da geração. O Administrador recebe a notificação apenas quando operar no contexto da filial afetada.
5. Cada notificação é individual por destinatário: um mesmo evento gera um registro em `notification` para cada usuário destinatário.
6. O campo `read` inicia como `false`. É marcado como `true` quando o destinatário marca a notificação como lida ou a dispensa (dismiss).
7. Quando a notificação `book_arrival` é gerada, o campo `customer_wishlist.notified` é marcado como `true` para o item correspondente, evitando notificações duplicadas para o mesmo item de lista de desejos.
8. O job que verifica `shelf_overdue` não deve gerar notificação duplicada para o mesmo livro se já existir uma notificação `shelf_overdue` não lida (`read = false`) para aquele `book_id` e `user_id`. Uma nova notificação só é gerada quando a anterior foi lida/dispensada ou quando o livro foi atualizado (novo `registered_at`).
9. Notificações não têm prazo de expiração automático — permanecem até serem lidas ou dispensadas pelo destinatário.
10. Não existe envio de notificação por canal externo (e-mail, SMS, WhatsApp) neste escopo.

## Critérios de aceite

```gherkin
Funcionalidade: Geração de notificações in-app

  Cenário: Notificação book_arrival gerada ao cadastrar livro correspondente a wishlist
    Dado que o cliente "Ana Souza" possui "Dom Casmurro" na lista de desejos da filial "Centro"
    E a filial "Centro" possui dois usuários ativos: um Gerente e um Caixa
    Quando um livro com título "Dom Casmurro" é cadastrado na filial "Centro" via 001-01
    Então dois registros são criados em "notification" com "type = book_arrival"
    E um registro é direcionado ao Gerente e outro ao Caixa
    E o campo "customer_wishlist.notified" do item correspondente é marcado como "true"

  Cenário: Notificação book_arrival não gerada quando item já notificado
    Dado que o item "Dom Casmurro" da lista de desejos de "Ana Souza" possui "notified = true"
    Quando um segundo livro com título "Dom Casmurro" é cadastrado na mesma filial
    Então nenhuma nova notificação "book_arrival" é gerada para aquele item da lista de desejos

  Cenário: Notificação shelf_overdue gerada pelo job agendado
    Dado que a filial "Centro" possui "days_threshold = 30" configurado em "shelf_threshold"
    E o livro "Memórias Póstumas" possui "registered_at" há 31 dias
    E não existe notificação "shelf_overdue" não lida para aquele livro e o Gerente da filial
    Quando o job agendado executa a verificação de tempo de prateleira
    Então um registro é criado em "notification" com "type = shelf_overdue"
    E o destinatário é o Gerente ativo da filial "Centro"

  Cenário: Notificação shelf_overdue não duplicada enquanto anterior não lida
    Dado que já existe uma notificação "shelf_overdue" com "read = false" para o livro "X" e o Gerente "Y"
    Quando o job agendado executa novamente
    Então nenhuma nova notificação é gerada para o mesmo par livro-usuário

  Cenário: Nova notificação shelf_overdue permitida após leitura da anterior
    Dado que a notificação "shelf_overdue" do livro "X" para o Gerente "Y" possui "read = true"
    E o livro "X" ainda excede o prazo de prateleira
    Quando o job agendado executa novamente
    Então uma nova notificação "shelf_overdue" é gerada para o par livro-usuário
```

## Quem pode acessar

Este módulo não possui interface de usuário própria. A lógica de geração de notificações é executada internamente pelo sistema (via cadastro de livro e job agendado). A visualização e interação com notificações são responsabilidade da feature `014-01.central-notificacoes`.

## Fora de escopo

- Interface de usuário para listagem ou interação com notificações (coberto por `014-01.central-notificacoes`).
- Entrega por canal externo: e-mail, SMS, WhatsApp ou push mobile.
- Notificações para o perfil Catalogador.
- Tipos de notificação além de `book_arrival` e `shelf_overdue`.
- Configuração do intervalo de execução do job agendado via interface (é configuração de infraestrutura).
- Notificações para clientes (o sistema é exclusivamente de uso interno da equipe).
- Arquivamento ou exclusão permanente de notificações pelo usuário.
