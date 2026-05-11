# Listar Livros Vencidos em Prateleira — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `012-00.tempo-prateleira`. Implementa o endpoint `GET /books/shelf-overdue` e a tela `/shelf-overdue` no frontend.

O cálculo de vencimento é realizado em tempo real no banco de dados, sem tabela auxiliar ou cache pré-computado. O predicado canônico está definido em `012-00.tempo-prateleira/tech.md` — esta especificação não o redefine.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura de `book`, `book_stock`, `shelf_threshold`, `branch` |
| API | `GET /books/shelf-overdue` com query params de filtro e paginação |
| Frontend | Tela `/shelf-overdue`; consome `GET /books/shelf-overdue` |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Todas as tabelas utilizadas já existem no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

O índice `idx_book_branch_active` (changeSet `002-book-catalog-indexes`, de `001-00.catalogo-livros/tech.md`) e o índice implícito de unicidade em `shelf_threshold(branch_id)` são suficientes para o planner do PostgreSQL executar o predicado de forma eficiente em volumes esperados.

Para suportar consultas de vencimento com ordenação por `registered_at DESC` dentro de uma filial, o índice `idx_book_registered_at` definido em `001-00.catalogo-livros/tech.md` como `ON book(branch_id, registered_at DESC)` já cobre o caso.

### Estratégia de migração

Nenhuma migration nova é necessária. Rollback não aplicável.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil Administrador (`branchId = null` no JWT), o parâmetro `branch_id` como query param é opcional: se omitido, retorna livros vencidos de todas as filiais.

---

### `GET /books/shelf-overdue`

> Esta rota deve ser registrada **antes** de `GET /books/{id}` no controller para evitar que `shelf-overdue` seja interpretado como UUID path variable.

Retorna a lista paginada de livros cujo tempo em prateleira supera o `days_threshold` configurado para a filial. O campo `days_on_shelf` é calculado em tempo real — não é persistido.

- **Authorization:** `Gerente`, `Administrador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | apenas para `Administrador`; filtra por filial específica; se omitido, retorna todas as filiais |
  | `page` | `integer` | não | página 0-based; padrão `0` |
  | `size` | `integer` | não | itens por página; padrão `20`; máx. `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "category": "string",
        "condition": "new|used",
        "sale_price": 0.00,
        "days_on_shelf": 0,
        "branch_id": "uuid",
        "branch_name": "string"
      }
    ],
    "threshold_configured": true,
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

  > O campo `threshold_configured` indica se a filial do usuário (Gerente) possui `shelf_threshold` configurado. Para o Administrador que consulta todas as filiais, este campo é `true` quando ao menos uma filial possui threshold. O frontend usa este campo para exibir a mensagem de aviso adequada quando `false`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada com sucesso (pode ser vazia) |
  | `400` | `branch_id` inválido (não é UUID) |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` tentando acessar |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Lista vazia retorna `200` com `content: []` — nunca `404`.
  - Gerente: `branch_id` do query param é ignorado; o escopo é sempre o `branchId` do JWT.
  - Gerente em filial sem `shelf_threshold`: retorna `200` com `content: []` e `threshold_configured: false`.
  - Administrador sem `branch_id`: aplica o predicado em todas as filiais que possuem `shelf_threshold` configurado (o JOIN INNER com `shelf_threshold` exclui filiais não configuradas naturalmente).
  - Os itens são ordenados por `days_on_shelf DESC` — mais antigos primeiro. Essa ordenação é aplicada antes da paginação.

## DTOs de domínio

```
ShelfOverdueItemResponse  — item do array "content"
ShelfOverduePageResponse  — wrapper paginado; inclui campo "threshold_configured"
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? A query de vencimento é I/O-bound (JOIN entre `book`, `book_stock`, `shelf_threshold`). Candidata a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java são compatíveis com AOT sem configuração adicional.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna sensível exposta. `branch_id` e `branch_name` são dados operacionais sem classificação de sigilo.
- [ ] Casos de autorização por perfil cobertos? `Catalogador` e `Caixa` recebem `403`. `Gerente` recebe somente livros da própria filial (isolamento via JWT). `Administrador` pode filtrar por `branch_id` ou ver todas.

## Estratégia de testes

### Fluxo principal (happy path)

- Gerente autentica com `branchId` = filial A; filial A tem `days_threshold = 30`; 2 livros com > 30 dias de estoque, ativos e com `quantity > 0` → resposta `200` com `content.length = 2`, `threshold_configured: true`, ordenados por `days_on_shelf DESC`.
- Administrador sem `branch_id` → retorna livros vencidos de todas as filiais configuradas.
- Administrador com `branch_id` = filial B → retorna apenas livros vencidos da filial B.
- Paginação: `page=0&size=1` em lista com 3 vencidos → `total_elements = 3`, `content.length = 1`.

### Casos de erro esperados

- Gerente em filial sem `shelf_threshold` → `200` com `content: []`, `threshold_configured: false`.
- Filial com `shelf_threshold` configurado mas sem livros vencidos → `200` com `content: []`, `threshold_configured: true`.
- `GET /books/shelf-overdue` com `branch_id` não-UUID → `400`.

### Casos de autorização

- Perfil `Catalogador` → `403`.
- Perfil `Caixa` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.
- Gerente passando `branch_id` de outra filial no query param → campo ignorado; resultado escopo da filial do JWT.

### Casos de borda das regras de negócio

- Livro com exatamente `days_threshold` dias (não superior) → não aparece na lista.
- Livro com `active = false` → não aparece, mesmo que tempo exceda o threshold.
- Livro com `quantity = 0` → não aparece, mesmo que tempo exceda o threshold.
- Livro com desconto ativo → aparece normalmente.
- Dois livros com mesmo título, um com 40 dias e outro com 20 dias (`threshold = 30`) → apenas o de 40 dias aparece.
- Livro vendido (estoque zerado via PDV) → desaparece da lista no próximo carregamento.

## Riscos técnicos e dependências

1. **Rota `/books/shelf-overdue` conflita com `/books/{id}`.** A rota deve ser registrada antes de `GET /books/{id}` no controller Spring, conforme já observado em `001-00.catalogo-livros/tech.md` para `GET /books/search`. Spring MVC prioriza rotas literais sobre path variables, mas a ordem de declaração no controller deve ser explícita.

2. **Performance em volume alto.** O predicado usa `EXTRACT(DAY FROM (now() - b.registered_at)) > st.days_threshold`, que não é sargable em índices B-tree convencionais sobre `registered_at`. Para volumes moderados (centenas de livros por filial), a performance é aceitável. Se o catálogo crescer para dezenas de milhares de livros, pode ser necessário calcular uma coluna `overdue_since` ou criar um índice parcial. Não é requisito desta iteração.

3. **Dependência de `010-02.editar-filial` para configuração do threshold.** Se nenhuma filial tiver `shelf_threshold` configurado (ex.: sistema recém-instalado), o endpoint retorna listas vazias para todos os usuários. Comportamento correto — sem risco de falha.
