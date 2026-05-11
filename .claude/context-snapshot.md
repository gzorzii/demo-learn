# Handoff — 2026-05-08

## Done

- Pipeline de definição completo: todos os 14 módulos e 38 sub-features têm business.md + tech.md
- Módulos 001-002 (sessão anterior): 001-00 a 001-06, 002-00 a 002-02
- Módulos 003-014 (esta sessão): todos os sub-features de 003 a 014 com business.md + tech.md

## Feature tree (status final)

```text
001-00.catalogo-livros         ✅ business + tech
├── 001-01.cadastrar-livro     ✅
├── 001-02.editar-livro        ✅
├── 001-03.listar-livros       ✅
├── 001-04.visualizar-livro    ✅
├── 001-05.buscar-livros       ✅
└── 001-06.gerenciar-imagens-livro ✅

002-00.etiquetas               ✅
├── 002-01.configurar-tamanhos-etiqueta ✅
└── 002-02.imprimir-etiquetas  ✅

003-00.descontos               ✅
├── 003-01.criar-desconto      ✅
├── 003-02.listar-descontos    ✅
└── 003-03.remover-desconto    ✅

004-00.pdv                     ✅
├── 004-01.gerenciar-carrinho-pdv ✅
├── 004-02.resgatar-voucher-pdv ✅
├── 004-03.selecionar-pagamento-pdv ✅
└── 004-04.finalizar-venda     ✅

005-00.vouchers                ✅
├── 005-01.emitir-voucher      ✅
└── 005-02.listar-vouchers     ✅

006-00.compra-usados           ✅
├── 006-01.registrar-compra-lote ✅
└── 006-02.gerenciar-livros-lote ✅

007-00.clientes                ✅
├── 007-01.cadastrar-cliente   ✅
├── 007-02.editar-cliente      ✅
├── 007-03.listar-clientes     ✅
└── 007-04.gerenciar-lista-desejos ✅

008-00.metodos-pagamento       ✅
└── 008-01.configurar-metodos-pagamento ✅

009-00.usuarios                ✅
├── 009-01.cadastrar-usuario   ✅
├── 009-02.editar-usuario      ✅
└── 009-03.listar-usuarios     ✅

010-00.filiais                 ✅
├── 010-01.cadastrar-filial    ✅
├── 010-02.editar-filial       ✅
└── 010-03.listar-filiais      ✅

011-00.relatorios              ✅
├── 011-01.relatorio-vendas    ✅
├── 011-02.relatorio-livros-vendidos ✅
├── 011-03.relatorio-estoque-baixo ✅
└── 011-04.relatorio-vouchers  ✅

012-00.tempo-prateleira        ✅
└── 012-01.listar-livros-vencidos ✅

013-00.historico-precos        ✅
└── 013-01.consultar-historico-precos ✅

014-00.notificacoes            ✅
└── 014-01.central-notificacoes ✅
```

## Decisions

- Carrinho PDV é estado local do frontend (sem persistência no banco)
- `POST /pdv/books/lookup` dedicado ao PDV (unifica book + stock + desconto em um endpoint)
- Voucher resgatado dentro da transação de `POST /sales` (não via POST /vouchers/{id}/redeem)
- Preços re-validados no backend na finalização (effectivePrice <= originalPrice && > 0)
- 006-01: emissão de voucher para vendedor é síncrona na mesma transação do lote
- 014-01: tipo correto é `shelf_overdue` (não `shelf_time`) — alinhado com 000-01
- Notif DELETE = seta read=true (não exclui fisicamente)
- 011-xx: exportação apenas xlsx (não csv); format=csv retorna 400
- Invalidação de sessão em 009-02: não imediata (JWT stateless sem blacklist); documentado como limitação aceita
- `shelf_threshold` em 010-02: UPSERT por branch_id (INSERT ON CONFLICT DO UPDATE)
- 003-00: GET /discounts/active adicional para PDV com precedência book > category > author > price_range
- 004-00: changeSet `006-pdv-schema-alignment` necessário para alinhar tabelas sale/sale_item com schema real de 000-01

## Conventions

- Language: pt-BR para prose; English para routes, types, SQL, code
- Agentes sempre foreground (run_in_background: false)
- settings.json Allow rule: Write(/home/gzorzi/projects/demo-learn/product/features/**)

## Current state

Pipeline de definição 100% completo. Todos os 14 módulos + 38 sub-features têm business.md e tech.md.
Código de implementação ainda não escrito — próxima fase é backend-developer por feature.

## Next steps

1. Invocar `@backend-developer` com caminho do tech.md desejado para iniciar implementação
2. Ordem sugerida por dependências:
   - Fase 1 (base): 000-xx (já concluído), 009-xx (usuários), 010-xx (filiais), 008-xx (pagamentos)
   - Fase 2 (catálogo): 001-xx, 002-xx, 013-xx (histórico depende de 001-02)
   - Fase 3 (clientes/vouchers): 007-xx, 005-xx, 003-xx (descontos)
   - Fase 4 (compra usados): 006-xx
   - Fase 5 (PDV): 004-xx (depende de 001/003/005/007/008)
   - Fase 6 (relatórios/notificações): 011-xx, 012-xx, 014-xx

## Important context

- product/description.md estável — não re-executar po-discovery
- Tabelas já existentes em 000-01 (não recriar): book, book_image, book_stock, label_config, customer, customer_wishlist, voucher, voucher_usage, used_book_purchase, used_book_purchase_item, sale, sale_item, sale_payment, payment_method, branch, shelf_threshold, price_history, notification, user, role, user_role
- Migration crítica: used_book_purchase_item.book_id deve ser nullable (atualmente NOT NULL em 000-01)
- Migration crítica: changeSet 006-pdv-schema-alignment para alinhar sale/sale_item com contracts do PDV
- book_arrival notif: disparada em 001-01 pós-commit, verifica customer_wishlist por ISBN
- shelf_overdue notif: disparada por job agendado que verifica 012-01 query
- GET /customers/search: endpoint do domínio 007-03, consumido por 005-01, 006-01 e 004-xx
- StorageService interface abstrata em 001-06 (filesystem local, preparado para S3)
- price_history INSERT: dentro da transação de 001-02 (precede UPDATE book)
