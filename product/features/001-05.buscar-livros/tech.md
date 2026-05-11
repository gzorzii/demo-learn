# Buscar Livros — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature de leitura do módulo de catálogo (`001-00.catalogo-livros`). Expõe a rota `GET /books/search` — já contratada no `tech.md` de `001-00` — e especifica os requisitos exclusivos desta funcionalidade: estratégia de busca textual no PostgreSQL, isolamento por filial, paginação, e o fluxo de troca de filial pelo Administrador.

Camadas afetadas:

- **Backend:** query de leitura em `book` e `book_stock`; nenhuma escrita.
- **Frontend:** tela `/books/search` com campo de busca, listagem de resultados e link para `/books/:id`.

Domínios lidos por esta feature:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Catálogo (`001-00`) | `book`, `book_stock` | leitura |
| Filiais (`000-01`) | `branch` | leitura indireta — escopo via `branch_id` do JWT |
| Usuários/Auth (`000-02`) | claims do JWT | leitura — identificação do ator e `branchId` |

Nenhuma tabela nova é criada ou alterada por esta sub-feature.

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Todas as tabelas utilizadas (`book`, `book_stock`) já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados` e estão documentadas em `001-00.catalogo-livros/tech.md`.

### Índices relevantes para a busca

Os índices B-tree `idx_book_title` e `idx_book_author` (criados em `000-01.modelagem-dados`) **não cobrem buscas com prefixo coringa** (`ILIKE '%termo%'`). O filtro `active = true` combinado com `branch_id` utiliza `idx_book_branch_active` (criado em `001-00.catalogo-livros`).

Para volume de catálogo esperado em livrarias de pequeno e médio porte, os índices B-tree existentes são suficientes. A degradação com `ILIKE '%termo%'` em catálogos grandes é um risco documentado em `001-00` (risco 4). Se necessário numa iteração futura, substituir por índice `GIN` com extensão `pg_trgm`:

```sql
-- Índice trigrama — aplicar somente se performance for insuficiente com B-tree
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_book_title_trgm  ON book USING GIN (title  gin_trgm_ops);
CREATE INDEX idx_book_author_trgm ON book USING GIN (author gin_trgm_ops);
CREATE INDEX idx_book_isbn_trgm   ON book USING GIN (isbn   gin_trgm_ops);
```

A criação desses índices, se necessária, deve ser feita em um novo changeSet separado (`003-book-search-trgm-indexes`) sem alterar os changeSets anteriores.

### Estratégia de migração

Nenhuma migração necessária para o escopo atual. Os índices trigrama são opcionais e aplicados apenas se a análise de performance indicar necessidade. Rollback do changeSet opcional: `DROP INDEX` em cada índice + `DROP EXTENSION pg_trgm` (se não houver outros usos).

## Contratos de API

> Contrato completo definido em `001-00.catalogo-livros/tech.md`, seção `GET /books/search`. Esta seção documenta os aspectos comportamentais específicos desta sub-feature.

### `GET /books/search`

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa` — todos os perfis autenticados.
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Validação |
  |-----------|------|-------------|-----------|
  | `q` | `string` | sim | mínimo 1 caractere; máximo 200 caracteres; ausente ou vazio → `400` |
  | `branch_id` | `UUID` | não | aceito apenas para o perfil `Administrador`; ignorado para os demais perfis independentemente do valor enviado |
  | `page` | `integer` | não | 0-based; padrão `0` |
  | `size` | `integer` | não | padrão `20`; máximo `100`; valores acima de `100` → `400` |

- **Lógica de busca:**

  A query aplica as três condições em `OR` sobre livros com `active = true` da filial resolvida:

  ```sql
  SELECT b.id, b.title, b.author, b.category, b.condition, b.sale_price,
         COALESCE(bs.quantity, 0) AS stock_quantity
  FROM   book b
  LEFT JOIN book_stock bs ON bs.book_id = b.id AND bs.branch_id = :branchId
  WHERE  b.branch_id = :branchId
    AND  b.active = TRUE
    AND  (
           b.title  ILIKE '%' || :q || '%'
        OR b.author ILIKE '%' || :q || '%'
        OR b.isbn   ILIKE '%' || :q || '%'
    )
  ORDER BY b.title ASC
  LIMIT  :size OFFSET :page * :size;
  ```

  > Ordenação padrão por `title ASC` para facilitar leitura em tela — ausente na spec de negócio, necessária para paginação determinística.

- **Resolução do `branch_id` de escopo:**

  | Perfil | Fonte do `branch_id` |
  |--------|---------------------|
  | `Gerente`, `Catalogador`, `Caixa` | claim `branchId` do JWT; query param `branch_id` é ignorado |
  | `Administrador` | query param `branch_id` quando presente; caso ausente, usa o `branchId` do JWT (que pode ser `null` — ver edge cases) |

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
        "stock_quantity": 0
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

  O tipo `BookSummaryResponse` e o wrapper `BookPageResponse` são os mesmos usados por `GET /books` (definidos em `001-00.catalogo-livros/tech.md`, seção DTOs de domínio).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Busca executada com sucesso (resultado pode ser lista vazia) |
  | `400` | `q` ausente, vazio ou com mais de 200 caracteres; `size` acima de 100 |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (não aplicável — todos os perfis autenticados têm acesso) |
  | `500` | Erro inesperado no servidor |

- **Edge cases:**

  - Busca sem resultados retorna `200` com `content: []` — nunca `404`.
  - Se `Administrador` não enviar `branch_id` e o `branchId` do JWT for `null`, o serviço deve retornar `400` com mensagem indicando que o parâmetro `branch_id` é obrigatório para Administradores sem filial associada. Isso previne uma query sem escopo de filial que percorreria todo o catálogo.
  - `stock_quantity` vem de `book_stock.quantity` via `LEFT JOIN`; livros sem registro em `book_stock` retornam `stock_quantity: 0`.
  - O parâmetro `q` não é sanitizado além da validação de tamanho — o uso de `ILIKE` com bind parameter parametrizado previne SQL injection.
  - A rota `GET /books/search` deve ser declarada **antes** de `GET /books/{id}` no controller Spring MVC. Embora rotas literais tenham precedência sobre path variables no Spring MVC, a ordem de declaração deve ser explícita para evitar ambiguidade em futuras versões do framework.

## Frontend

### Tela `/books/search`

Esta tela é nova e introduzida exclusivamente por esta sub-feature.

**Componentes e arquivos:**

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/pages/books/BookSearchPage.tsx` | Página principal: campo de busca, disparo da query e renderização dos resultados |
| `src/services/bookService.ts` | Função `searchBooks(q, page, size, branchId?)` — `GET /books/search`; reutiliza o mesmo service de `001-03` se já existir |
| `src/types/book.ts` | Type `BookSummaryResponse` e `BookPageResponse` — compartilhados com `001-03.listar-livros` se já definidos |

**Comportamento esperado da tela:**

- Campo de texto único para entrada do termo de busca.
- Busca disparada ao pressionar Enter ou acionar o botão "Pesquisar".
- Enquanto a requisição está em curso, exibir indicador de carregamento.
- Resultados exibem: título, autor, categoria, condição (`novo`/`usado`), preço de venda e quantidade em estoque — conforme regra de negócio 4.
- Cada resultado é um link para `/books/:id` (rota de `001-04.visualizar-livro`).
- Quando `content` é vazio, exibir a mensagem: `"Nenhum livro encontrado para os termos informados"`.
- Quando `q` é enviado vazio (bypass de validação frontend), exibir mensagem de validação inline sem disparar requisição ao backend.
- Paginação: controles de página exibidos quando `total_pages > 1`; ao mudar de página, reexecutar a busca mantendo o termo atual.

**Troca de filial pelo Administrador:**

- O seletor de filial já existe no layout global (`TopBar`) conforme `000-03.home-navegacao`.
- Ao trocar de filial, o `branchId` ativo é atualizado no estado global (store ou context).
- `BookSearchPage` deve observar o `branchId` ativo; quando ele muda enquanto há resultados exibidos, reexecutar a busca automaticamente com o novo `branch_id` como query param.
- O mecanismo de troca de filial em si está fora do escopo desta feature — depende da implementação de `000-03` e do estado global de filial do Administrador.

**Entrada no menu de navegação lateral (`Sidebar`):**

- Já mapeada em `000-03.home-navegacao/tech.md` sob a chave `'books-search'` com perfis `['Administrador', 'Gerente', 'Catalogador', 'Caixa']`.
- Nenhuma alteração em `modulePermissions.ts` é necessária — a entrada já existe.

**Rota no `AppRouter.tsx`:**

```typescript
<Route path="/books/search" element={
  <RoleRoute allowedRoles={MODULE_PERMISSIONS['books-search']}>
    <BookSearchPage />
  </RoleRoute>
} />
```

> Esta rota deve ser declarada **antes** da rota `/books/:id` no `AppRouter.tsx` para evitar que `search` seja tratado como parâmetro dinâmico pelo React Router.

## Requisitos de qualidade

- [ ] I/O-bound identificado: `GET /books/search` executa query com `ILIKE` em `book` e `LEFT JOIN` em `book_stock` — candidato a virtual thread (Java 25 / Project Loom).
- [ ] GraalVM AOT: nenhum uso novo de reflexão além do que `001-00` já utiliza. `BookSummaryResponse` e `BookPageResponse` são records — compatíveis.
- [ ] Dados sensíveis: nenhuma coluna sensível exposta na resposta de busca. `branch_id` do request para Administrador é validado no serviço, nunca refletido sem filtro.
- [ ] Autorização por perfil: todos os quatro perfis têm acesso de leitura. O isolamento por filial é sempre aplicado no backend — o `branch_id` do JWT nunca é sobrescrito pelo cliente, exceto para `Administrador` via query param explícito.
- [ ] Caso de borda do Administrador sem filial coberto: `branch_id` `null` no JWT com parâmetro ausente → `400` explícito.

## Estratégia de testes

### Fluxo principal (happy path)

- Buscar por substring de título; verificar que apenas livros da filial com `active = true` cujo título contém o termo retornam.
- Buscar por substring de autor; verificar correspondência parcial case-insensitive.
- Buscar por ISBN parcial; verificar correspondência.
- Buscar por ISBN exato; verificar que o livro correspondente aparece.
- Verificar que `stock_quantity` retorna `0` para livros sem registro em `book_stock`.
- Verificar paginação: busca com mais de `size` resultados retorna `total_elements` correto e `content` truncado ao tamanho da página.
- Administrador enviando `branch_id` válido como query param; verificar que apenas livros daquela filial retornam.

### Casos de erro esperados

- `q` ausente → `400`.
- `q` com string vazia (`q=`) → `400`.
- `q` com mais de 200 caracteres → `400`.
- `size` com valor `101` → `400`.
- Administrador sem `branch_id` no query param e sem `branchId` no JWT → `400`.
- JWT ausente → `401`.
- JWT expirado → `401`.

### Casos de autorização

- `Caixa` autenticado executa `GET /books/search?q=dom` → `200`.
- `Catalogador` autenticado executa `GET /books/search?q=machado` → `200`.
- `Caixa` envia `branch_id` como query param → parâmetro ignorado; busca realizada no `branchId` do JWT.
- Requisição sem cookie `auth_token` → `401`.

### Casos de borda das regras de negócio

- Livro com `active = false` nunca aparece nos resultados, mesmo que o termo bata com título, autor ou ISBN.
- Busca com termo em maiúsculas batendo com título em minúsculas (e vice-versa) → resultado retornado (case-insensitive).
- Administrador troca de filial durante busca ativa; verificar que a busca é reexecutada com o novo `branch_id` e retorna resultados da nova filial.
- Busca retorna livro com `book_stock` registrado em outra filial (não na filial de escopo da busca); verificar que `stock_quantity` retorna `0` (LEFT JOIN filtrado por `branch_id`).

## Riscos técnicos e dependências

1. **Performance de `ILIKE '%termo%'` sem índice trigrama.** A busca com prefixo e sufixo coringa não usa os índices B-tree existentes em `idx_book_title` e `idx_book_author`. Para catálogos pequenos, não é problema. Se a análise de performance em produção indicar latência elevada, aplicar o changeSet `003-book-search-trgm-indexes` com índices `GIN + pg_trgm` conforme descrito na seção de modelo de dados.

2. **Administrador sem filial associada.** O JWT de Administrador pode ter `branchId = null`. Sem tratamento explícito, uma query sem cláusula `WHERE branch_id = ?` retornaria registros de todas as filiais — violação de isolamento. O serviço deve retornar `400` neste caso ao invés de executar a busca sem escopo.

3. **Dependência de ordem de rotas no backend e no frontend.** A rota `/books/search` conflita com `/books/{id}` em ambos os lados. No Spring MVC, rotas literais têm precedência sobre path variables, mas a declaração explícita e em ordem é necessária. No React Router v6+, o comportamento é semelhante, mas a ordem no `AppRouter.tsx` também deve ser respeitada.

4. **Troca de filial pelo Administrador depende de estado global do frontend.** O mecanismo de seleção e persistência do `branchId` ativo para o Administrador não está implementado por esta feature — é responsabilidade de `000-03.home-navegacao` ou de um store global a ser definido. Esta feature assume que o `branchId` ativo está disponível via hook ou context e que a reexecução da busca ao trocar de filial é possível via reatividade do estado.
