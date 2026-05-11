# Criar Desconto — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo de descontos (`003-00.descontos`). Expõe o endpoint `POST /discounts`, que persiste um novo desconto com escopo flexível e, quando o escopo é `book`, insere os vínculos correspondentes em `discount_book` dentro da mesma transação.

Nenhuma tabela nova é criada: `discount` e `discount_book` já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. O módulo adiciona índices complementares sobre `discount` para suportar as consultas de verificação de conflito e as futuras listagens do módulo 003.

Camadas afetadas:

- **Backend:** leitura de `book` (validação de existência e pertencimento à filial), leitura de `discount` e `discount_book` (verificação de conflito), escrita em `discount` e `discount_book`.
- **Frontend:** tela `/discounts/new` com formulário condicional de acordo com o escopo selecionado.

Domínios externos lidos ou escritos por esta feature:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Modelagem (`000-01`) | `discount`, `discount_book` | escrita — criação do desconto e vínculos |
| Catálogo (`001-00`) | `book` | leitura — validação de existência, pertencimento à filial e verificação de conflito via `discount_book` |
| Filiais (`000-01`) | `branch` | leitura indireta — escopo via `branch_id` do JWT |
| Autenticação (`000-02`) | JWT claims | leitura — `sub` (created_by) e `branchId` do usuário autenticado |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas**. As tabelas `discount` e `discount_book` já existem pelo changeSet `001-initial-schema`.

#### `discount` (existente)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `scope` | `TEXT` | NOT NULL | — | valores: `'book'` \| `'category'` \| `'author'` \| `'price_range'`; validado na camada de serviço |
| `value_type` | `TEXT` | NOT NULL | — | valores: `'percentage'` \| `'fixed'`; validado na camada de serviço |
| `value` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0; máx. 100 quando `value_type = 'percentage'` |
| `category` | `TEXT` | NULL | — | obrigatório na camada de serviço quando `scope = 'category'` |
| `author` | `TEXT` | NULL | — | obrigatório na camada de serviço quando `scope = 'author'` |
| `min_price` | `NUMERIC(10,2)` | NULL | — | obrigatório na camada de serviço quando `scope = 'price_range'`; deve ser > 0 |
| `max_price` | `NUMERIC(10,2)` | NULL | — | obrigatório na camada de serviço quando `scope = 'price_range'`; deve ser > `min_price` |
| `starts_at` | `TIMESTAMP` | NULL | — | quando ausente, o desconto vigora a partir da criação |
| `ends_at` | `TIMESTAMP` | NULL | — | quando ausente, o desconto não expira; quando presente, deve ser posterior a `starts_at` (ou a `now()` se `starts_at` for nulo) |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | sempre `TRUE` na criação |
| `created_by` | `UUID` | NOT NULL | — | FK → `"user"(id)`; extraído do claim `sub` do JWT |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

#### `discount_book` (existente)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `discount_id` | `UUID` | NOT NULL | — | FK → `discount(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| — | — | — | — | PK composta `(discount_id, book_id)` |

O `ON DELETE CASCADE` em `discount_book` garante que, ao remover um desconto (feature `003-03`), todos os vínculos com livros são removidos automaticamente, sem ação adicional no serviço.

### Índices

Os índices abaixo devem ser adicionados em um novo changeSet (`005-discount-indexes`) para não reescrever o changeSet original. São necessários tanto para a verificação de conflito de vigência quanto para a listagem de descontos por filial (feature `003-02`).

```sql
-- Listagem e verificação de conflito por filial
CREATE INDEX idx_discount_branch ON discount(branch_id);

-- Verificação de conflito por vigência dentro de uma filial
-- A verificação de sobreposição de períodos usa branch_id + active + ends_at + starts_at
CREATE INDEX idx_discount_branch_active ON discount(branch_id, active);

-- Lookup de vínculos por livro (verificação de conflito para scope = book)
CREATE INDEX idx_discount_book_book ON discount_book(book_id);
```

> `idx_discount_book_book` é necessário porque a verificação de conflito para escopo `book` precisa encontrar rapidamente todos os descontos ativos vinculados a um `book_id` específico. Sem esse índice, a query de conflito faz seq scan em `discount_book` para cada livro da lista enviada.

### Estratégia de migração

Nenhuma tabela ou coluna nova é criada. O changeSet `005-discount-indexes` adiciona três índices sobre tabelas existentes. Rollback seguro: `DROP INDEX` nos três índices sem perda de dados. Dados existentes não requerem migração.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. O `branch_id` de escopo do desconto é **sempre** extraído do claim `branchId` do JWT — não é aceito no body da requisição. O claim `sub` do JWT é usado como valor de `created_by`.

---

### `POST /discounts`

Cria um novo desconto vinculado à filial do usuário autenticado. Quando `scope = 'book'`, insere os vínculos em `discount_book` na mesma transação.

- **Authorization:** `Gerente`, `Administrador`

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `scope` | `string` | sim | valores: `'book'` \| `'category'` \| `'author'` \| `'price_range'`; imutável após criação |
  | `value_type` | `string` | sim | valores: `'percentage'` \| `'fixed'` |
  | `value` | `number` | sim | > 0; máx. 2 casas decimais; quando `value_type = 'percentage'`, máx. `100` |
  | `category` | `string` | condicional | obrigatório quando `scope = 'category'`; não vazio; máx. 150 caracteres |
  | `author` | `string` | condicional | obrigatório quando `scope = 'author'`; não vazio; máx. 300 caracteres |
  | `min_price` | `number` | condicional | obrigatório quando `scope = 'price_range'`; > 0; máx. 2 casas decimais |
  | `max_price` | `number` | condicional | obrigatório quando `scope = 'price_range'`; > `min_price`; máx. 2 casas decimais |
  | `book_ids` | `array<UUID>` | condicional | obrigatório quando `scope = 'book'`; mínimo 1 elemento; máximo 200 elementos; todos os UUIDs devem pertencer à filial do usuário e ter `active = true` |
  | `starts_at` | `string (ISO-8601)` | não | quando presente, deve ser um timestamp válido; ausente = vigência imediata |
  | `ends_at` | `string (ISO-8601)` | não | quando presente, deve ser posterior a `starts_at` (se informado) ou a `now()` (se `starts_at` ausente) |

  > Campos não pertinentes ao escopo informado (ex.: `category` enviado junto com `scope = 'book'`) devem ser ignorados pelo serviço — não retornar `400` por campos extras não esperados.

  > `book_ids` não é persistido como coluna em `discount`; é usado exclusivamente para popular `discount_book` após a criação do registro principal.

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "branch_id": "uuid",
    "scope": "book|category|author|price_range",
    "value_type": "percentage|fixed",
    "value": 0.00,
    "category": "string|null",
    "author": "string|null",
    "min_price": 0.00,
    "max_price": 0.00,
    "starts_at": "ISO-8601|null",
    "ends_at": "ISO-8601|null",
    "active": true,
    "created_by": "uuid",
    "created_at": "ISO-8601",
    "book_ids": ["uuid"]
  }
  ```

  > O campo `book_ids` na resposta é incluído apenas quando `scope = 'book'`, contendo os UUIDs dos vínculos criados em `discount_book`. Para os demais escopos, `book_ids` é omitido ou retornado como `null`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Desconto criado com sucesso |
  | `400` | Falha de validação: campo obrigatório ausente, `value` fora dos limites, `ends_at` anterior ou igual a `starts_at`/`now()`, `scope` ou `value_type` com valor inválido, `min_price` ≥ `max_price`, `book_ids` vazio quando `scope = 'book'` |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` (apenas `Gerente` e `Administrador` são permitidos) |
  | `404` | Um ou mais `book_ids` não encontrados na filial ou com `active = false` |
  | `409` | Um ou mais livros já possuem desconto ativo com período de vigência sobreposto; corpo da resposta inclui a lista de conflitos (ver abaixo) |
  | `500` | Erro inesperado no servidor |

- **Corpo da resposta `409` — conflito de vigência:**

  Quando detectado conflito, o serviço retorna `409` com o seguinte corpo para que o frontend possa exibir a lista de livros bloqueados e seus respectivos descontos ativos:

  ```json
  {
    "message": "Um ou mais livros já possuem desconto ativo com período de vigência sobreposto.",
    "conflicts": [
      {
        "book_id": "uuid",
        "book_title": "string",
        "conflicting_discount_id": "uuid",
        "conflicting_discount_value": 0.00,
        "conflicting_discount_value_type": "percentage|fixed",
        "conflicting_starts_at": "ISO-8601|null",
        "conflicting_ends_at": "ISO-8601|null"
      }
    ]
  }
  ```

- **Edge cases:**

  - **Resolução de `branch_id`:** o `branch_id` do desconto é sempre o `branchId` do claim JWT. O perfil `Administrador` não pode sobrescrever o `branch_id` via body — se precisar criar desconto em filial específica, deve estar autenticado com JWT cuja claim `branchId` aponta para aquela filial. Se `branchId` no JWT for `null` (Administrador global sem filial), o endpoint retorna `400` com mensagem "Filial não associada ao usuário. Selecione uma filial antes de criar um desconto."

  - **Atomicidade para `scope = 'book'`:** a inserção em `discount` e em `discount_book` (um registro por `book_id`) deve ocorrer dentro de uma única transação. Se qualquer inserção em `discount_book` falhar, toda a operação é revertida.

  - **Verificação de conflito de vigência — lógica de sobreposição:** dois períodos `[A_start, A_end]` e `[B_start, B_end]` se sobrepõem quando `A_start < B_end AND A_end > B_start`. Quando `starts_at` ou `ends_at` são nulos (ausência de limite), o período é tratado como aberto: `null` em `starts_at` é equivalente a `−∞` e `null` em `ends_at` é equivalente a `+∞`. A verificação é executada **antes** de iniciar a transação de criação.

  - **Verificação de conflito para `scope = 'book'`:** a query deve identificar, para cada `book_id` da lista enviada, se existe algum desconto ativo (`active = true`) vinculado a ele em `discount_book` cujo período de vigência se sobreponha ao período do novo desconto. A query de verificação deve ser feita em uma única consulta que retorna todos os conflitos de uma vez — não uma consulta por livro.

  - **Verificação de conflito para `scope != 'book'`:** para escopos `category`, `author` e `price_range`, a verificação de conflito consiste em identificar todos os livros da filial cobertos pelo escopo informado e verificar se algum deles possui desconto de escopo `book` ativo com período sobreposto, ou se já existe outro desconto de escopo equivalente (mesma categoria, mesmo autor, mesma faixa de preço) com período sobreposto. O contrato de retorno de conflito é o mesmo (`409` com lista de conflitos).

  - **`starts_at` ausente:** o serviço não preenche `starts_at` com `now()` — persiste `NULL` em `discount.starts_at`. A lógica de "vigência imediata" é interpretada pelas queries de verificação de conflito e pelo PDV, não pelo dado armazenado.

  - **`value` para `percentage`:** o valor máximo de 100 é validado na camada de serviço com mensagem explícita. O banco armazena `NUMERIC(10,2)` sem constraint de valor máximo.

  - **`book_ids` com UUIDs duplicados:** deduplicar antes de consultar e inserir — cada livro aparece no máximo uma vez em `discount_book` (garantido pela PK composta).

---

### `GET /books/search` (dependência — não novo)

O autocomplete do seletor de livros no formulário de criação (`scope = 'book'`) reutiliza o endpoint `GET /books/search` já definido em `001-00.catalogo-livros/tech.md`. Nenhum endpoint adicional é necessário para essa funcionalidade. O frontend deve passar o `branch_id` apenas se o ator for `Administrador`.

---

## DTOs de domínio

Os DTOs abaixo são definidos como Java records no pacote `com.ciet.demo_learn.discount`.

```
DiscountCreateRequest    — body de POST /discounts
                           campos: scope (String, @NotBlank),
                                   valueType (String, @NotBlank),
                                   value (BigDecimal, @NotNull, @DecimalMin("0.01")),
                                   category (String, nullable),
                                   author (String, nullable),
                                   minPrice (BigDecimal, nullable),
                                   maxPrice (BigDecimal, nullable),
                                   bookIds (List<UUID>, nullable),
                                   startsAt (Instant, nullable),
                                   endsAt (Instant, nullable)

DiscountResponse         — resposta de POST /discounts (201)
                           campos: id (UUID), branchId (UUID), scope (String),
                                   valueType (String), value (BigDecimal),
                                   category (String|null), author (String|null),
                                   minPrice (BigDecimal|null), maxPrice (BigDecimal|null),
                                   startsAt (Instant|null), endsAt (Instant|null),
                                   active (boolean), createdBy (UUID), createdAt (Instant),
                                   bookIds (List<UUID>|null)

DiscountConflictResponse — corpo de resposta 409
                           campos: message (String),
                                   conflicts (List<DiscountConflictItem>)

DiscountConflictItem     — item dentro de DiscountConflictResponse
                           campos: bookId (UUID), bookTitle (String),
                                   conflictingDiscountId (UUID),
                                   conflictingDiscountValue (BigDecimal),
                                   conflictingDiscountValueType (String),
                                   conflictingStartsAt (Instant|null),
                                   conflictingEndsAt (Instant|null)
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? A operação de criação envolve: (1) query de validação dos `book_ids` contra `book`, (2) query de verificação de conflito em `discount` + `discount_book`, (3) INSERT em `discount`, (4) INSERT em lote em `discount_book`. Todas são operações de banco — candidatas a virtual threads (habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records Java (`DiscountCreateRequest`, `DiscountResponse`, `DiscountConflictResponse`, `DiscountConflictItem`) são compatíveis com AOT. As entidades JPA `Discount` e `DiscountBook` devem estar cobertas em `reflect-config.json` se AOT for ativado.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna em `discount` ou `discount_book` contém CPF, CNPJ, senha ou token. O `created_by` é UUID de usuário — exposto na resposta como referência não sensível.
- [ ] Autorização por perfil coberta em todos os endpoints? Apenas `Gerente` e `Administrador` têm acesso a `POST /discounts`. `Catalogador` e `Caixa` recebem `403`. O isolamento por filial é sempre verificado no backend via claim `branchId` do JWT — nunca sobrescrito pelo corpo da requisição.

## Estratégia de testes

### Fluxo principal (happy path)

- Criar desconto com `scope = 'book'`, `value_type = 'percentage'`, `value = 10`, lista de `book_ids` válidos sem conflito; verificar `201`, `active = true`, vínculos criados em `discount_book` para cada `book_id`.
- Criar desconto com `scope = 'category'` sem datas de vigência; verificar `201` com `starts_at = null` e `ends_at = null`.
- Criar desconto com `scope = 'author'` com `starts_at` e `ends_at` válidos; verificar que os campos são persistidos corretamente.
- Criar desconto com `scope = 'price_range'` com `min_price` e `max_price` válidos; verificar `201`.
- Criar desconto com `scope = 'book'` e `book_ids` com duplicatas; verificar que a deduplicação ocorre e a inserção em `discount_book` não falha.
- Verificar que `branch_id` no registro criado corresponde ao `branchId` do JWT — não a qualquer valor enviado no body.
- Verificar que `created_by` no registro criado corresponde ao `sub` do JWT.

### Casos de erro esperados

- `value_type = 'percentage'` com `value = 101` → `400` com mensagem "O percentual de desconto não pode exceder 100%".
- `value = 0` → `400`.
- `scope = 'book'` com `book_ids` ausente ou vazio → `400`.
- `scope = 'category'` com `category` ausente → `400`.
- `scope = 'author'` com `author` ausente → `400`.
- `scope = 'price_range'` com `min_price` ausente → `400`.
- `scope = 'price_range'` com `max_price <= min_price` → `400`.
- `ends_at` anterior a `starts_at` → `400` com mensagem "A data de fim deve ser posterior à data de início".
- `ends_at` no passado com `starts_at` ausente → `400`.
- `scope = 'book'` com pelo menos um `book_id` inexistente na filial → `404`.
- `scope = 'book'` com pelo menos um `book_id` de livro `active = false` → `404`.
- `scope = 'book'` com livros que já possuem desconto ativo com período sobreposto → `409` com lista de conflitos contendo: `book_id`, `book_title`, dados do desconto conflitante.
- `scope = 'book'` com mistura de livros sem conflito e com conflito → `409` com apenas os conflitantes na lista; nenhum registro criado.
- JWT ausente → `401`.
- JWT expirado → `401`.
- `branchId` no JWT é `null` (Administrador global) → `400`.

### Casos de autorização

- `Gerente` autenticado criando desconto → `201`.
- `Administrador` autenticado criando desconto → `201`.
- `Catalogador` tentando `POST /discounts` → `403`.
- `Caixa` tentando `POST /discounts` → `403`.
- Requisição sem cookie `auth_token` → `401`.

### Casos de borda das regras de negócio

- Desconto de `scope = 'book'` criado com `starts_at` no futuro; verificar que a verificação de conflito ainda considera o período futuro ao checar sobreposição com desconto existente cujo `ends_at` está no mesmo intervalo.
- Dois descontos de `scope = 'category'` para a mesma categoria com períodos não sobrepostos — deve ser permitido (`201`).
- Dois descontos de `scope = 'book'` para o mesmo livro em períodos não sobrepostos — deve ser permitido (`201`).
- Desconto de `scope = 'book'` com `ends_at = null` e tentativa de criar segundo desconto para o mesmo livro sem `starts_at` — deve ser bloqueado (`409`) pois os períodos são `[−∞, +∞]` e `[−∞, +∞]`, que se sobrepõem.
- `book_ids` com 200 elementos (limite máximo); verificar que todos os vínculos são criados em `discount_book` sem erro.
- Criação atômica: simular falha na inserção em `discount_book` após `discount` criado; verificar que `discount` não foi persistido (rollback da transação).

## Riscos técnicos e dependências

1. **Query de verificação de conflito para `scope != 'book'` tem complexidade não trivial.** Para escopos `category`, `author` e `price_range`, identificar quais livros da filial são cobertos pelo novo escopo requer uma query que correlaciona `book.category`, `book.author` ou `book.sale_price` com os parâmetros do desconto, cruzando com `discount_book` para verificar conflitos de escopo `book`. A query pode ser custosa em filiais com catálogos grandes. Índices `idx_book_branch_category` e `idx_book_branch_condition` (criados em `002-book-catalog-indexes` de `001-00`) cobrem parcialmente esse caso. Avaliar se o volume esperado justifica otimização adicional.

2. **Verificação de conflito entre escopos heterogêneos não está completamente especificada no `business.md`.** A regra 8 menciona "um livro só pode ter um desconto ativo por vez", mas não detalha o que ocorre quando um desconto de `scope = 'category'` e um desconto de `scope = 'book'` cobrem o mesmo livro simultaneamente. A implementação deve tratar esse caso como conflito — qualquer desconto ativo que afete o mesmo livro, independentemente do tipo de escopo, deve ser detectado. Isso requer que a verificação cruzada entre escopos seja implementada explicitamente no serviço.

3. **Dependência de `003-02.listar-descontos` como tela de retorno.** Após criação bem-sucedida, o frontend redireciona para `/discounts`. A feature `003-02` ainda não possui `tech.md` — a implementação do redirecionamento depende de que a listagem esteja funcional ou ao menos que a rota `/discounts` exista no frontend. Em uma entrega incremental, a feature `003-01` pode ser entregue com redirecionamento para `/` como fallback temporário.

4. **`branchId = null` no JWT para Administrador.** O perfil `Administrador` pode ter `branchId = null` no JWT quando não está operando no contexto de uma filial específica. A criação de desconto sem filial definida é inviável (a tabela `discount` exige `branch_id NOT NULL`). O endpoint deve retornar `400` explícito neste caso. O mecanismo de seleção de filial para o Administrador é responsabilidade de `000-03.home-navegacao` e do estado global do frontend — esta feature assume que o `branchId` estará presente no JWT no momento da criação.

5. **Limite de 200 `book_ids` por requisição.** Não há constraint no banco para esse limite — ele é aplicado apenas na camada de serviço. Em cenários futuros com filiais de catálogo muito grande, a operação de verificação de conflito pode ser lenta para listas próximas ao limite. O valor de 200 é uma estimativa conservadora para livrarias de pequeno e médio porte; deve ser revisado se o perfil de uso indicar necessidade de listas maiores.
