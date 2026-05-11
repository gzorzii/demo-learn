# Tempo em Prateleira

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Define as regras de negócio que governam o rastreamento do tempo que um livro permanece no estoque sem ser vendido. Cada registro de livro possui um temporizador independente iniciado no momento do cadastro (`book.registered_at`). Quando o tempo decorrido supera o prazo configurado para a filial (`shelf_threshold.days_threshold`), o livro é considerado "vencido em prateleira". Este módulo estabelece o contrato de cálculo e os critérios de vencimento utilizados pelas sub-features `012-01.listar-livros-vencidos` e pelo módulo de notificações (`014-01.central-notificacoes`).

## Atores envolvidos

- **Gerente** — destinatário das alertas de vencimento de prateleira e responsável por tomar ações sobre os livros vencidos.
- **Administrador** — acesso global; pode visualizar livros vencidos de qualquer filial; configura o `days_threshold` de cada filial na tela de edição de filial (`010-02.editar-filial`).

## Regras de negócio

1. O temporizador de prateleira é individual por registro de livro (`book.id`) e inicia no valor de `book.registered_at`.
2. O tempo em prateleira é calculado como a diferença em dias inteiros entre a data atual e `book.registered_at`.
3. Um livro é considerado "vencido em prateleira" quando o tempo em prateleira calculado é estritamente maior que o `days_threshold` configurado para a filial à qual o livro pertence (`book.branch_id`).
4. O prazo (`days_threshold`) é configurado por filial pelo Administrador na tela `010-02.editar-filial` e armazenado em `shelf_threshold`. Não existe prazo padrão do sistema — filiais sem `shelf_threshold` configurado não possuem livros vencidos.
5. Descontos ativos não interrompem, pausam nem reiniciam o temporizador de prateleira.
6. A venda de um livro encerra seu ciclo de vida no estoque; livros vendidos não aparecem em listas de vencidos.
7. Livros com `book.active = false` (desativados do catálogo) não são considerados para fins de vencimento de prateleira.
8. Livros com `book_stock.quantity = 0` (sem estoque) também não são considerados vencidos para efeito de exibição e notificação — o vencimento aplica-se apenas a livros disponíveis para venda.
9. Cada cadastro de livro representa um timer independente, mesmo que o mesmo título possua múltiplos registros no sistema.
10. O campo `book.registered_at` é definido no momento da criação do registro e nunca é alterado retroativamente.

## Critérios de aceite

```gherkin
Dado que a filial possui shelf_threshold.days_threshold = 30
E um livro foi cadastrado há 31 dias (registered_at = hoje - 31 dias)
E o livro possui book.active = true e book_stock.quantity > 0
Quando o sistema calcula o tempo em prateleira do livro
Então o livro é classificado como "vencido em prateleira"

Dado que a filial possui shelf_threshold.days_threshold = 30
E um livro foi cadastrado há 30 dias (registered_at = hoje - 30 dias)
E o livro possui book.active = true e book_stock.quantity > 0
Quando o sistema calcula o tempo em prateleira do livro
Então o livro NÃO é classificado como "vencido" (o limiar é estritamente maior)

Dado que a filial não possui shelf_threshold configurado
E existem livros cadastrados há muitos dias
Quando o sistema avalia vencimentos para essa filial
Então nenhum livro é classificado como vencido em prateleira

Dado que um livro possui book.active = false
Quando o sistema avalia vencimentos da filial
Então esse livro não é incluído na avaliação de vencimento

Dado que um livro possui book_stock.quantity = 0
Quando o sistema avalia vencimentos da filial
Então esse livro não é classificado como vencido em prateleira

Dado que o livro A e o livro B possuem o mesmo título e ISBN
E o livro A foi cadastrado há 40 dias
E o livro B foi cadastrado há 10 dias
E days_threshold da filial = 30
Quando o sistema avalia vencimentos
Então apenas o livro A é classificado como vencido
E o livro B não é classificado como vencido

Dado que um livro possui um desconto ativo
E foi cadastrado há mais dias do que o days_threshold da filial
Quando o sistema avalia vencimentos
Então o livro é classificado como vencido normalmente
E o desconto ativo não altera o resultado da avaliação
```

## Quem pode acessar

- As regras de cálculo e os dados resultantes são acessíveis para os perfis **Gerente** e **Administrador**.
- O Gerente visualiza apenas os livros vencidos da própria filial.
- O Administrador pode visualizar livros vencidos de qualquer filial.

## Fora de escopo

- Configuração do prazo de prateleira (`days_threshold`) — coberto por `010-02.editar-filial`.
- Listagem de livros vencidos na interface — coberta por `012-01.listar-livros-vencidos`.
- Envio de notificações in-app ao Gerente quando um livro vence — coberto pelo módulo `014-01.central-notificacoes`.
- Ações sobre livros vencidos (desconto automático, inativação, sugestão de promoção) — fora do escopo do produto atual.
- Relatório histórico de vencimentos passados.
- Configuração de múltiplos limiares (ex.: amarelo/vermelho) por filial.
