# Relatório de Livros Vendidos — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Implementa o endpoint `GET /reports/books-sold`, que agrega as vendas por título no período informado e retorna um ranking de livros com quantidade total vendida e receita gerada por cada título. Suporta ordenação por quantidade (padrão) ou por receita, com limite de resultados configurável. É estritamente somente leitura — não escreve em nenhuma tabela.

Camadas afetadas: persistência (query analítica sobre `sale`, `sale_item` e `book`), serviço de domínio de relatório de livros vendidos, e frontend React com tela `/relatorios/livros-vendidos`.

Tabelas lidas:

| Tabela | Uso |
|--------|-----|
| `sale` | filtro por `branch_id` + `sold_at`; JOIN raiz para restringir ao período e filial |
| `sale_item` | JOIN com `sale`; soma de `quantity` e `discounted_price * quantity` por livro |
| `book` | JOIN com `sale_item`; título, autor para agrupamento e exibição |

Convenções de autorização e exportação definidas em `011-00.relatorios/tech.md` aplicam-se integralmente aqui.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. As tabelas `sale`, `sale_item` e `book` foram criadas em `000-01.modelagem-dados`.

O índice `idx_sale_branch_sold_at` definido em `011-00.relatorios/tech.md` é necessário para este endpoint (mesmo índice usado por 011-01).

### Estratégia de migração

Não aplicável. Ver changeSet `003-report-indexes` em `011-00.relatorios/tech.md`.

---

## Contratos de API

### `GET /reports/books-sold`

Retorna o ranking de livros mais vendidos de uma filial no período informado.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras de validação |
  |-----------|------|-------------|---------------------|
  | `from` | `string` (YYYY-MM-DD) | sim | data válida; deve ser ≤ `to` |
  | `to` | `string` (YYYY-MM-DD) | sim | data válida; deve ser ≥ `from` |
  | `branch_id` | `UUID` | condicional | obrigatório para `Administrador`; ignorado para `Gerente` (usa `branchId` do JWT) |
  | `sort` | `string` | não | `quantity` (padrão) ou `revenue`; qualquer outro valor → `400` |
  | `limit` | `integer` | não | número de itens retornados; padrão `20`; máximo `200`; mínimo `1`; valores fora do intervalo → `400` |
  | `format` | `string` | não | aceita apenas `xlsx`; omitido retorna JSON; `csv` retorna `400` |

- **Lógica de escopo de filial:**
  - `Gerente`: `branch_id` = `branchId` do JWT; qualquer `branch_id` enviado no query param é ignorado.
  - `Administrador`: `branch_id` do query param é obrigatório; se ausente → `400`.

- **Lógica de ordenação:**
  - `sort=quantity` (padrão): `ORDER BY total_quantity DESC`
  - `sort=revenue`: `ORDER BY total_revenue DESC`
  - Em caso de empate, o desempate secundário é por `book.title ASC` para resultado determinístico.

- **Query SQL de referência:**

  > A query abaixo representa a lógica. A implementação pode usar JPQL, Criteria API ou query nativa.

  ```sql
  SELECT
      b.id                                          AS book_id,
      b.title                                       AS title,
      b.author                                      AS author,
      SUM(si.quantity)                              AS total_quantity,
      SUM(si.discounted_price * si.quantity)        AS total_revenue
  FROM sale s
  JOIN sale_item si ON si.sale_id = s.id
  JOIN book b       ON b.id = si.book_id
  WHERE s.branch_id = :branchId
    AND s.sold_at >= :from::date
    AND s.sold_at <  (:to::date + INTERVAL '1 day')
  GROUP BY b.id, b.title, b.author
  ORDER BY
      -- substitua pela coluna de ordenação selecionada
      SUM(si.quantity) DESC,   -- ou SUM(si.discounted_price * si.quantity) DESC
      b.title ASC
  LIMIT :limit;
  ```

  > `discounted_price` é o preço efetivamente cobrado (já com desconto aplicado, conforme regra 9 do `business.md`). Quando não há desconto, `discounted_price = unit_price`. Nenhuma lógica especial é necessária — o campo já contém o valor correto.

- **Response `200` (JSON):**

  ```json
  {
    "branchId": "uuid",
    "from": "2026-01-01",
    "to": "2026-01-31",
    "sort": "quantity",
    "limit": 20,
    "items": [
      {
        "bookId": "uuid",
        "title": "Dom Casmurro",
        "author": "Machado de Assis",
        "totalQuantity": 15,
        "totalRevenue": 449.85
      },
      {
        "bookId": "uuid",
        "title": "O Cortiço",
        "author": "Aluísio Azevedo",
        "totalQuantity": 9,
        "totalRevenue": 179.91
      }
    ]
  }
  ```

  > Quando não há vendas no período, `items` retorna lista vazia. Nunca retornar `404` — sempre `200`.

- **Response `200` (Excel — `format=xlsx`):**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="relatorio-livros-vendidos-<from>-<to>.xlsx"`
  - Planilha com cabeçalhos: Posição, Título, Autor, Quantidade Vendida, Receita (R$).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Relatório gerado com sucesso (pode ter lista vazia) |
  | 400 | `from` ou `to` ausentes ou inválidos; `to` < `from`; `branch_id` ausente para Administrador; `sort` inválido; `limit` fora do intervalo 1–200; `format=csv` |
  | 401 | Usuário não autenticado |
  | 403 | Perfil `Catalogador` ou `Caixa` |
  | 404 | `branch_id` informado não encontrado (apenas para Administrador) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Um livro pode aparecer em múltiplas vendas no período — o GROUP BY por `book.id` consolida corretamente.
  - Livros usados (`condition = 'used'`) que foram vendidos **aparecem** no relatório — não há filtro de condição neste relatório. O business.md não exclui usados; apenas 011-03 tem essa restrição.
  - O campo `sort` controla apenas a ordenação dos resultados já filtrados pelo período — não afeta a query de filtro.
  - `limit` aplica-se ao número de linhas retornadas (TOP N); não é paginação — não há `page` ou `offset`.

---

## DTOs de domínio

```
BooksSoldReportRequest  — parâmetros de query validados (from, to, branch_id, sort, limit, format)
BooksSoldItem           — item do ranking: bookId, title, author, totalQuantity, totalRevenue
BooksSoldReportResponse — resposta JSON: branchId, from, to, sort, limit, items
```

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Sim — query analítica com GROUP BY, JOIN triplo e LIMIT; candidata a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Não aplicável.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível nas tabelas consultadas. `cashier_id` e `customer_id` de `sale` não são retornados.
- [ ] Casos de autorização por perfil cobertos? Sim — mesmas regras de `011-01`; ver convenções em `011-00`.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Gerente consulta com período válido e vendas de múltiplos livros: verificar ordenação por quantidade decrescente e cálculo correto de `totalRevenue`.
- Consulta com `sort=revenue`: verificar reordenação por receita decrescente.
- Consulta com `limit=5` e 10 livros vendidos: verificar que apenas os 5 primeiros retornam.
- Administrador consulta com `branch_id` válido: verificar isolamento de filial.
- Mesmo livro vendido em múltiplas vendas no período: verificar que `totalQuantity` soma corretamente.
- Relatório com `format=xlsx`: verificar headers e abertura do arquivo.

**Casos de erro esperados**
- `from` ausente: `400`.
- `to` ausente: `400`.
- `to` anterior a `from`: `400`.
- `sort=price` (valor inválido): `400`.
- `limit=0`: `400`.
- `limit=201`: `400`.
- `format=csv`: `400`.
- Administrador sem `branch_id`: `400`.

**Casos de autorização**
- `Catalogador` acessa: `403`.
- `Caixa` acessa: `403`.
- Usuário não autenticado: `401`.
- Gerente com `branch_id` no query param: backend ignora e usa JWT.

**Edge cases de regras de negócio**
- Período sem vendas: `items` vazio, status `200`.
- Dia único (`from == to`): vendas do dia inteiro incluídas.
- Empate em `totalQuantity` entre dois livros: desempate por `title ASC`.
- Livro usado vendido: deve aparecer no relatório (não filtrado por condição).
- `discounted_price` diferente de `unit_price` (desconto aplicado): verificar que `totalRevenue` usa `discounted_price`, não `unit_price`.

---

## Riscos técnicos e dependências

1. **Dependência do changeSet `003-report-indexes` (011-00):** O índice `idx_sale_branch_sold_at` é compartilhado com 011-01. Se o changeSet já foi aplicado por 011-01, este endpoint já está coberto.

2. **Volume de grupos no GROUP BY:** Para filiais com catálogo extenso e período longo, o GROUP BY pode gerar muitos grupos antes do LIMIT. O índice em `sale(branch_id, sold_at)` reduz a cardinalidade inicial, mas o JOIN com `sale_item` pode ser custoso. Em catálogos grandes, considerar materialização de resultado ou índice adicional em `sale_item(sale_id)` se identificado como gargalo.

3. **`book.id` como chave de agrupamento vs. títulos duplicados:** Livros com o mesmo título mas IDs diferentes (ex.: edições distintas cadastradas separadamente) aparecem como itens separados no ranking. O business.md especifica agrupamento por "título + autor", mas a query proposta agrupa por `book.id`. Para alinhar com a regra de negócio, o agrupamento deve ser por `(b.title, b.author)` — nesse caso, `bookId` na resposta não faz sentido e deve ser omitido. A decisão entre agrupar por ID ou por (título, autor) deve ser tomada e documentada na implementação; a opção mais segura é por `book.id` para evitar colisões de títulos com autores homônimos.
