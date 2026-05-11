# Consultar Histórico de Preços — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `013-00.historico-precos`. Implementa dois endpoints de consulta somente leitura e duas telas no frontend:

- `GET /books/{id}/price-history` — histórico de um livro específico, acessível via botão em `001-04.visualizar-livro`.
- `GET /price-history` — relatório geral com filtros por título, autor e período.

**Zero escritas** neste módulo. Toda geração de registros em `price_history` ocorre em `001-02.editar-livro`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura de `price_history`, `book`, `"user"`, `branch` |
| API | `GET /books/{id}/price-history` e `GET /price-history` |
| Frontend | Telas `/books/:id/price-history` e `/price-history` |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. As tabelas `price_history`, `book`, `"user"` e `branch` já existem em `000-01.modelagem-dados`.

O índice `idx_price_history_changed_at ON price_history(changed_at DESC)` definido em `013-00.historico-precos/tech.md` (changeSet `003-price-history-indexes`) deve ser criado antes da implementação das queries deste módulo.

### Consultas principais

**Por livro específico** (usado por `GET /books/{id}/price-history`):

```sql
SELECT
    ph.id,
    b.title,
    ph.previous_price,
    ph.new_price,
    ph.changed_at,
    u.name AS changed_by_name
FROM price_history ph
JOIN book b ON b.id = ph.book_id
JOIN "user" u ON u.id = ph.changed_by
WHERE ph.book_id = :bookId
ORDER BY ph.changed_at DESC;
```

**Relatório geral com filtros** (usado por `GET /price-history`):

```sql
SELECT
    ph.id,
    b.title,
    b.author,
    b.branch_id,
    ph.previous_price,
    ph.new_price,
    ph.changed_at,
    u.name AS changed_by_name
FROM price_history ph
JOIN book b ON b.id = ph.book_id
JOIN "user" u ON u.id = ph.changed_by
WHERE b.branch_id IN (:branchIds)             -- escopo por perfil
  AND (:title IS NULL OR b.title ILIKE '%' || :title || '%')
  AND (:author IS NULL OR b.author ILIKE '%' || :author || '%')
  AND (:from IS NULL OR ph.changed_at >= :from)
  AND (:to IS NULL OR ph.changed_at <= :to)
ORDER BY ph.changed_at DESC
LIMIT :size OFFSET :offset;
```

> `branchIds` para Gerente = `[branchId do JWT]`; para Administrador = todas as filiais ativas (ou filial específica se `branch_id` query param for fornecido).

### Estratégia de migração

Changesets necessários:

| ChangeSet | Operação | Rollback |
|-----------|----------|---------|
| `003-price-history-indexes` | `CREATE INDEX idx_price_history_changed_at ON price_history(changed_at DESC)` | `DROP INDEX idx_price_history_changed_at` |

Dados existentes não requerem migração. O índice é criado sem restrições de valor.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O escopo de filial é determinado pelo claim `branchId` do JWT para Gerente; Administrador vê todas as filiais por padrão.

---

### `GET /books/{id}/price-history`

Retorna o histórico completo de alterações de preço de um livro específico, em ordem cronológica decrescente. Não possui paginação — assume-se volume de alterações por livro pequeno o suficiente para retorno completo.

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `id` — UUID do livro

- **Response `200`:**

  ```json
  {
    "book_id": "uuid",
    "book_title": "string",
    "history": [
      {
        "id": "uuid",
        "previous_price": 0.00,
        "new_price": 0.00,
        "changed_at": "ISO-8601",
        "changed_by_name": "string"
      }
    ]
  }
  ```

  > `history` pode ser array vazio quando o livro nunca teve preço alterado desde o cadastro. Isso é resposta válida `200`, não `404`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Livro encontrado e pertence ao escopo do usuário; `history` pode ser vazio |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a filial fora do escopo do Gerente; ou perfil `Catalogador` / `Caixa` |
  | `404` | UUID não encontrado em `book` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Gerente tentando acessar histórico de livro de outra filial → `403` (verificar `book.branch_id = branchId do JWT`).
  - Livro sem nenhum registro em `price_history` → `200` com `history: []`.

---

### `GET /price-history`

Relatório geral de histórico de preços com filtros opcionais. Retorna registros de `price_history` do escopo do usuário, em ordem cronológica decrescente.

- **Authorization:** `Gerente`, `Administrador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `title` | `string` | não | busca parcial case-insensitive em `book.title` (`ILIKE '%valor%'`) |
  | `author` | `string` | não | busca parcial case-insensitive em `book.author` (`ILIKE '%valor%'`) |
  | `from` | `string` | não | data/hora ISO-8601 (inclusive) — filtro em `price_history.changed_at >= from` |
  | `to` | `string` | não | data/hora ISO-8601 (inclusive) — filtro em `price_history.changed_at <= to` |
  | `page` | `integer` | não | página 0-based; padrão `0` |
  | `size` | `integer` | não | itens por página; padrão `20`; máx. `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "book_id": "uuid",
        "book_title": "string",
        "book_author": "string",
        "previous_price": 0.00,
        "new_price": 0.00,
        "changed_at": "ISO-8601",
        "changed_by_name": "string"
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Resultados retornados; pode ser `content: []` |
  | `400` | `from` ou `to` em formato de data inválido |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Sem nenhum filtro informado: retorna todos os registros no escopo do usuário, paginados.
  - Gerente: escopo restrito a `book.branch_id = branchId do JWT` — o parâmetro `branch_id` não é aceito (ignorado ou rejeitado com `400` se enviado).
  - `from > to`: retorna `200` com `content: []` (intervalo vazio) — não é erro de validação, é resultado vazio por definição.
  - `title` e `author` simultâneos: ambos aplicados com AND lógico.

## DTOs de domínio

```
PriceHistoryItemResponse     — item dentro de "history" em GET /books/{id}/price-history
BookPriceHistoryResponse     — resposta completa de GET /books/{id}/price-history
PriceHistoryReportItem       — item dentro de "content" em GET /price-history
PriceHistoryPageResponse     — wrapper paginado para GET /price-history
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? Ambos os endpoints realizam JOINs em PostgreSQL — candidatos a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java para DTOs são compatíveis com AOT.
- [ ] Dados sensíveis tratados adequadamente? O campo `changed_by_name` expõe o nome do usuário que alterou o preço — dado operacional, não sensível. Nenhum CPF, CNPJ, senha ou token é exposto.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `Catalogador` e `Caixa` recebem `403` em ambos os endpoints. Gerente está restrito à própria filial via verificação de `book.branch_id` no backend.

## Estratégia de testes

### Fluxo principal (happy path)

- Gerente acessa `GET /books/{id}/price-history` com livro da própria filial que teve 3 alterações de preço → `200` com `history.length = 3`, ordenado por `changed_at DESC`.
- Livro sem histórico → `200` com `history: []`.
- Gerente acessa `GET /price-history` sem filtros → retorna todos os registros da filial paginados.
- `GET /price-history?title=Dom` → retorna somente registros de livros com "Dom" no título.
- `GET /price-history?from=2025-01-01T00:00:00Z&to=2025-03-31T23:59:59Z` → apenas registros no período.
- `GET /price-history?title=Dom&author=Machado` → interseção dos dois filtros.
- Administrador acessa `GET /price-history` → retorna registros de todas as filiais.

### Casos de erro esperados

- `GET /books/{id}/price-history` com UUID inexistente → `404`.
- `GET /price-history?from=data-invalida` → `400`.
- `GET /price-history?to=data-invalida` → `400`.

### Casos de autorização

- Perfil `Catalogador` em `GET /books/{id}/price-history` → `403`.
- Perfil `Caixa` em `GET /price-history` → `403`.
- Gerente tentando `GET /books/{id}/price-history` com livro de outra filial → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Gerente acessa histórico de livro da própria filial com múltiplos registros de livros usados com o mesmo título — verifica que retorna histórico apenas do `book_id` solicitado, não de todos os livros com mesmo título.
- `GET /price-history?title=Dom` com Gerente → retorna somente livros da filial do Gerente com "Dom" no título; nunca livros de outras filiais.
- `from` igual a `to` → retorna registros com `changed_at` exatamente naquele momento (inclusivo em ambas as pontas).
- `from > to` → `200` com `content: []`.

## Riscos técnicos e dependências

1. **Dependência de `001-02.editar-livro` para dados históricos.** Se `PUT /books/{id}` não gerar registros em `price_history` corretamente, as telas de `013-01` exibirão histórico incompleto ou vazio. Não há como recuperar registros não criados. O teste de integração de `001-02` deve cobrir explicitamente a geração de `price_history`.

2. **`ILIKE '%termo%'` sem índice de texto completo.** Filtros por `title` e `author` em `GET /price-history` realizam `ILIKE` com wildcard prefixado no JOIN com `book`. Para catálogos com muitos livros e histórico extenso, a query pode ser lenta. Risco aceitável em volumes iniciais; `GIN + pg_trgm` pode ser adicionado em iteração futura. Documentado também em `001-00.catalogo-livros/tech.md`.

3. **`GET /books/{id}/price-history` sem paginação.** A ausência de paginação é intencional — o volume de alterações de preço por livro é tipicamente baixo (dezenas no máximo). Caso um livro acumule centenas de alterações, a resposta pode ficar grande. Monitorar em produção e adicionar paginação se necessário.

4. **Questão em aberto do `business.md`.** O `business.md` de `013-01` levanta a questão: o botão "Ver Histórico de Preços" em `/books/:id` deve ser exibido mesmo quando o livro não possui histórico? A decisão técnica recomendada é: **sempre exibir o botão** para Gerente e Administrador, e o endpoint retorna `history: []` quando não há registros — evitando chamada adicional ao backend apenas para controlar visibilidade do botão.
