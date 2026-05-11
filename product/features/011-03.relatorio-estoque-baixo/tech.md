# Relatório de Estoque Baixo — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Implementa o endpoint `GET /reports/low-stock`, que lista livros novos de uma filial cujo estoque atual está abaixo ou igual a um threshold informado ad hoc pelo usuário. Não há filtro de período — o relatório reflete o estado atual do estoque no momento da consulta. É estritamente somente leitura.

Camadas afetadas: persistência (query de leitura sobre `book` e `book_stock`), serviço de domínio de relatório de estoque baixo, e frontend React com tela `/relatorios/estoque-baixo`.

> O threshold deste relatório é **ad hoc**, informado pelo usuário em cada consulta. É independente do `days_threshold` da tabela `shelf_threshold` (módulo 012-xx), que controla alertas de tempo em prateleira. Nenhuma leitura de `shelf_threshold` é feita por este endpoint.

Tabelas lidas:

| Tabela | Uso |
|--------|-----|
| `book` | filtro por `branch_id`, `condition = 'new'`, `active = true`; título, autor, ISBN, categoria, localização |
| `book_stock` | JOIN com `book`; filtro `quantity <= :threshold`; valor de `quantity` para exibição |

Convenções de autorização e exportação definidas em `011-00.relatorios/tech.md` aplicam-se integralmente aqui.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. As tabelas `book` e `book_stock` foram criadas em `000-01.modelagem-dados`.

O índice `idx_book_branch_condition_active` definido em `011-00.relatorios/tech.md` é necessário para este endpoint.

### Estratégia de migração

Não aplicável. Ver changeSet `003-report-indexes` em `011-00.relatorios/tech.md`.

---

## Contratos de API

### `GET /reports/low-stock`

Retorna a lista de livros novos com estoque igual ou inferior ao threshold informado.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras de validação |
  |-----------|------|-------------|---------------------|
  | `threshold` | `integer` | sim | deve ser ≥ 1 (inteiro positivo); `0` ou negativo → `400` |
  | `branch_id` | `UUID` | condicional | obrigatório para `Administrador`; ignorado para `Gerente` (usa `branchId` do JWT) |
  | `format` | `string` | não | aceita apenas `xlsx`; omitido retorna JSON; `csv` retorna `400` |

- **Lógica de escopo de filial:**
  - `Gerente`: `branch_id` = `branchId` do JWT; qualquer `branch_id` enviado no query param é ignorado.
  - `Administrador`: `branch_id` do query param é obrigatório; se ausente → `400`.

- **Filtros aplicados pela query:**
  - `book.branch_id = :branchId` — escopo de filial.
  - `book.condition = 'new'` — somente livros novos (livros usados sempre têm estoque unitário e são excluídos por regra de negócio).
  - `book.active = true` — somente livros ativos.
  - `book_stock.quantity <= :threshold` — estoque no limite ou abaixo.
  - `book_stock.branch_id = :branchId` — stock da filial (a UNIQUE constraint em `book_stock(book_id, branch_id)` garante no máximo um registro por par).

- **Query SQL de referência:**

  ```sql
  SELECT
      b.id               AS book_id,
      b.title            AS title,
      b.author           AS author,
      b.isbn             AS isbn,
      b.category         AS category,
      b.shelf_location   AS shelf_location,
      bs.quantity        AS current_quantity
  FROM book b
  JOIN book_stock bs ON bs.book_id = b.id
                    AND bs.branch_id = :branchId
  WHERE b.branch_id   = :branchId
    AND b.condition   = 'new'
    AND b.active      = true
    AND bs.quantity  <= :threshold
  ORDER BY bs.quantity ASC, b.title ASC;
  ```

  > Livros novos sem registro em `book_stock` para a filial não aparecem — o JOIN exige correspondência. Se o sistema sempre cria `book_stock` ao cadastrar o livro (conforme `001-00.catalogo-livros/tech.md`), isso não é problema prático. O INNER JOIN é intencional.

  > Livros com `book_stock.quantity = 0` aparecem no relatório quando `threshold >= 0` — mas o threshold mínimo é `1`, então livros com estoque zerado **sempre** aparecem quando `threshold >= 1`. Isso é comportamento esperado — estoque zero é o caso mais crítico de reposição.

- **Response `200` (JSON):**

  ```json
  {
    "branchId": "uuid",
    "threshold": 3,
    "items": [
      {
        "bookId": "uuid",
        "title": "Memórias Póstumas de Brás Cubas",
        "author": "Machado de Assis",
        "isbn": "978-85-359-0277-5",
        "category": "Literatura Brasileira",
        "shelfLocation": "A-12",
        "currentQuantity": 0
      },
      {
        "bookId": "uuid",
        "title": "Iracema",
        "author": "José de Alencar",
        "isbn": "978-85-001-0001-1",
        "category": "Clássicos",
        "shelfLocation": null,
        "currentQuantity": 2
      }
    ]
  }
  ```

  > Quando não há livros abaixo do threshold, `items` retorna lista vazia. Nunca retornar `404` — sempre `200`.

  > `shelfLocation` pode ser `null` se `book.shelf_location` não foi informado no cadastro.

- **Response `200` (Excel — `format=xlsx`):**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="relatorio-estoque-baixo-threshold-<threshold>.xlsx"`
  - Planilha com cabeçalhos: Título, Autor, ISBN, Categoria, Localização, Quantidade em Estoque.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Relatório gerado com sucesso (pode ter lista vazia) |
  | 400 | `threshold` ausente; `threshold` ≤ 0 ou não inteiro; `branch_id` ausente para Administrador; `format=csv` |
  | 401 | Usuário não autenticado |
  | 403 | Perfil `Catalogador` ou `Caixa` |
  | 404 | `branch_id` informado não encontrado (apenas para Administrador) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - `threshold` enviado como decimal (ex.: `3.5`): rejeitar com `400` — deve ser inteiro.
  - `threshold` enviado como string não numérica (ex.: `abc`): rejeitar com `400`.
  - Livros usados (`condition = 'used'`) não aparecem, independentemente do estoque — filtro `condition = 'new'` exclui todos.
  - Livros com `active = false` não aparecem — filtro `active = true` exclui.
  - Sem período: este relatório não tem `from`/`to` — reflete o estado atual do banco no momento da consulta.

---

## DTOs de domínio

```
LowStockReportRequest   — parâmetros de query validados (threshold, branch_id, format)
LowStockItem            — item da lista: bookId, title, author, isbn, category,
                          shelfLocation, currentQuantity
LowStockReportResponse  — resposta JSON: branchId, threshold, items
```

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Sim — query com JOIN e filtro sobre `book` e `book_stock`; candidata a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Não aplicável.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível nas tabelas consultadas.
- [ ] Casos de autorização por perfil cobertos? Sim — mesmas regras dos outros relatórios; ver convenções em `011-00`.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Gerente informa `threshold=3` e existem livros novos com estoque 0, 1, 2 e 3: verificar que todos aparecem; livro com estoque 4 não aparece.
- Resultado ordenado por `currentQuantity ASC` com desempate por `title ASC`.
- Administrador consulta com `branch_id` válido: isolamento de filial correto.
- Relatório com `format=xlsx`: verificar headers e abertura do arquivo.

**Casos de erro esperados**
- `threshold` ausente: `400`.
- `threshold=0`: `400`.
- `threshold=-1`: `400`.
- `threshold=2.5`: `400`.
- `threshold=abc`: `400`.
- `format=csv`: `400`.
- Administrador sem `branch_id`: `400`.

**Casos de autorização**
- `Catalogador` acessa: `403`.
- `Caixa` acessa: `403`.
- Usuário não autenticado: `401`.
- Gerente com `branch_id` no query param: ignorado, usa JWT.

**Edge cases de regras de negócio**
- Filial sem nenhum livro abaixo do threshold: `items` vazio, status `200`.
- Livros usados com estoque baixo: não aparecem no relatório.
- Livros inativos com estoque baixo: não aparecem no relatório.
- Livro novo com `book_stock.quantity = 0` e `threshold=1`: deve aparecer (0 ≤ 1).
- Livro novo sem registro em `book_stock`: não aparece (INNER JOIN).

---

## Riscos técnicos e dependências

1. **Threshold sem valor padrão:** O business.md confirma que não há valor padrão — o threshold é sempre obrigatório. O endpoint rejeita com `400` se ausente. O frontend deve exibir o campo de threshold como obrigatório com placeholder sugerido (decisão de UX, fora do escopo deste tech.md).

2. **Conflito conceitual com `shelf_threshold` (012-xx):** O `shelf_threshold` persiste o limite de dias em prateleira para alertas de tempo. O `threshold` aqui é passado ad hoc e refere-se a quantidade de estoque. São conceitos distintos que não devem ser confundidos na implementação. O agente deve garantir que nenhuma leitura de `shelf_threshold` ocorra neste endpoint.

3. **Livros sem `book_stock`:** O módulo `001-xx` cria `book_stock` na mesma transação do cadastro do livro. Se por algum motivo um livro novo não tiver registro em `book_stock`, ele não aparecerá no relatório. Isso é comportamento correto — sem registro de estoque, a quantidade é desconhecida e não deve ser listada como "estoque baixo".
