# Tempo em Prateleira — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz que define o contrato de cálculo do tempo em prateleira. Não introduz endpoints próprios nem tabelas novas — o cálculo é realizado em tempo real a partir das tabelas `book`, `book_stock` e `shelf_threshold` já existentes no schema inicial de `000-01.modelagem-dados`.

Este documento serve como especificação normativa do predicado SQL de vencimento, consumido por:

- `012-01.listar-livros-vencidos` — listagem via `GET /books/shelf-overdue`
- `014-00.notificacoes` — job agendado que gera notificações `shelf_overdue`

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura de `book`, `book_stock`, `shelf_threshold`, `branch` |
| Serviço | Predicado de vencimento reutilizável; sem escrita |
| Frontend | Nenhum — módulo raiz sem tela própria |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas nem altera o schema**. Todas as tabelas são do changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Tabelas lidas pelo cálculo de vencimento:

| Tabela | Papel no cálculo |
|--------|-----------------|
| `book` | Fonte de `registered_at`, `branch_id`, `active` |
| `book_stock` | Fornece `quantity`; livros com `quantity = 0` são excluídos |
| `shelf_threshold` | Fornece `days_threshold` por filial; filiais sem registro são excluídas do cálculo |

### Predicado canônico de vencimento

O predicado abaixo é a definição técnica autoritativa de "livro vencido em prateleira". Toda implementação que avalie vencimentos **deve** produzir o comportamento equivalente:

```sql
-- Livros vencidos em prateleira de uma filial específica
SELECT
    b.id,
    b.title,
    b.author,
    b.category,
    b.condition,
    b.sale_price,
    b.branch_id,
    EXTRACT(DAY FROM (now() - b.registered_at))::INTEGER AS days_on_shelf
FROM book b
JOIN book_stock bs ON bs.book_id = b.id AND bs.branch_id = b.branch_id
JOIN shelf_threshold st ON st.branch_id = b.branch_id
WHERE b.active = true
  AND bs.quantity > 0
  AND EXTRACT(DAY FROM (now() - b.registered_at)) > st.days_threshold
ORDER BY days_on_shelf DESC;
```

Invariantes do predicado:

| Condição | Efeito |
|----------|--------|
| `b.active = false` | livro excluído da avaliação |
| `bs.quantity = 0` | livro excluído (sem estoque disponível) |
| `shelf_threshold` ausente para a filial | nenhum livro da filial é considerado vencido (JOIN INNER exclui filiais sem threshold) |
| Tempo decorrido **igual** a `days_threshold` | livro **não** é vencido — o critério é estritamente maior (`>`) |
| Descontos ativos | irrelevantes — nenhuma coluna de desconto é consultada no predicado |

> O uso de `EXTRACT(DAY FROM ...)` calcula dias inteiros decorridos sem considerar horas. Isso significa que um livro cadastrado às 23:59 de D-0 e consultado às 00:01 de D+1 já contabiliza 1 dia. Esse comportamento está alinhado com as regras de negócio de `012-00.business.md` (item 2: "diferença em dias inteiros").

### Estratégia de migração

Nenhuma migration é necessária. Schema já existe. Rollback não aplicável.

O índice `idx_book_branch_active` definido em `001-00.catalogo-livros/tech.md` (changeSet `002-book-catalog-indexes`) e o índice `idx_book_registered_at` cobrem parcialmente as colunas do predicado. Um índice adicional é recomendado para suportar o JOIN com `shelf_threshold`:

```sql
-- Já existe em 000-01.modelagem-dados: shelf_threshold.branch_id é UNIQUE (índice implícito)
-- Não requer índice adicional — o planner usará o índice de unicidade.
```

## Contratos de API

Este módulo raiz **não expõe endpoints próprios**. Os contratos estão em `012-01.listar-livros-vencidos/tech.md`.

## Requisitos de qualidade

- [ ] I/O-bound identificado? O cálculo é realizado inteiramente no banco via query SQL — operação I/O-bound. Candidato a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Não aplicável — este módulo não introduz classes novas além das entidades JPA já existentes.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna sensível (CPF, CNPJ, senha, token) é lida ou escrita. `branch_id` e `user_id` são UUIDs extraídos do JWT.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? Não aplicável a este módulo raiz.

## Estratégia de testes

O predicado canônico deve ser testado como unidade isolada (query test ou service test com banco de testes):

### Fluxo principal (happy path)

- Filial com `days_threshold = 30`; livro cadastrado há 31 dias, `active = true`, `quantity > 0` → deve ser classificado como vencido.
- Mesmo cenário com 30 dias → **não** deve ser classificado como vencido (limiar estrito).

### Casos de borda das regras de negócio

- Livro com `active = false` → não aparece no resultado independentemente do tempo.
- Livro com `quantity = 0` → não aparece no resultado.
- Filial sem `shelf_threshold` configurado → nenhum livro retornado para essa filial.
- Dois livros com mesmo título e ISBN, cadastrados em datas diferentes → apenas o mais antigo (acima do threshold) aparece.
- Livro com desconto ativo → aparece normalmente, desconto não interfere.

### Casos de autorização

Não aplicável a este módulo raiz — a autorização é responsabilidade dos consumidores do predicado.

## Riscos técnicos e dependências

1. **Dependência de `shelf_threshold` configurado.** Filiais sem registro em `shelf_threshold` não geram livros vencidos. A configuração ocorre em `010-02.editar-filial`. Se uma filial nunca tiver `shelf_threshold` configurado, o módulo 012 e o job de notificações simplesmente não produzem resultados para ela — comportamento correto e sem risco de falha.

2. **Precisão do cálculo `EXTRACT(DAY FROM ...)` vs. `AGE()`.** A função `EXTRACT(DAY FROM (now() - b.registered_at))` retorna apenas a componente de dias do intervalo, podendo divergir de `DATE_PART('day', AGE(...))` em casos de meses com dias diferentes. Para fins de negócio (dias corridos de estoque), `EXTRACT(DAY FROM ...)` sobre um `INTERVAL` é suficiente e consistente. A implementação deve usar esta forma, não `AGE()`, para garantir uniformidade entre o cálculo no job e na listagem.

3. **Volume de livros por filial.** Com catálogos grandes, a query sem filtro de filial pode retornar muitas linhas. O endpoint `012-01` aplica filtro por filial via JWT para Gerente; para Administrador sem filtro explícito, pode retornar dados de todas as filiais. Recomenda-se impor paginação por padrão no endpoint consumidor.
