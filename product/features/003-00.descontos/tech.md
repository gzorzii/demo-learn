# Descontos — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz que define o contrato de dados e os endpoints REST do sistema de descontos. Gerencia descontos aplicados ao catálogo de uma filial com quatro escopos (`book`, `category`, `author`, `price_range`) e dois tipos de valor (`percentage`, `fixed`). O design cobre as três sub-features do módulo: criação (003-01), listagem (003-02) e remoção (003-03).

As tabelas `discount` e `discount_book` já existem no schema inicial de `000-01.modelagem-dados`. Este módulo não cria novas tabelas; adiciona índices específicos para as queries do módulo e documenta as invariantes de uso, os contratos de API e a lógica de detecção de conflitos de vigência.

Camadas afetadas: persistência (JPA sobre PostgreSQL 18), serviço de domínio (validação, detecção de conflito, resolução de desconto ativo para o PDV) e frontend React com rotas `/discounts` e `/discounts/new`.

Domínios externos que este módulo lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo de todos os registros de desconto |
| Usuários/Auth (`000-01`, `000-02`) | `"user"`, `user_role`, `role` | leitura — identificação do ator, `branch_id` e autorização |
| Catálogo (`001-00`) | `book` | leitura — busca de livros para escopo `book`; detecção de conflito por `category`, `author`, `sale_price` |
| PDV (`004-xx`) | — | fornecimento — endpoints deste módulo são consumidos pelo PDV para calcular preços com desconto |

---

## Modelo de dados

### Tabelas existentes utilizadas pelo módulo

Todas as tabelas abaixo já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. Este módulo **não cria novas tabelas**.

#### `discount`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `scope` | `TEXT` | NOT NULL | — | valores aceitos: `'book'` \| `'category'` \| `'author'` \| `'price_range'`; validado no serviço |
| `value_type` | `TEXT` | NOT NULL | — | valores aceitos: `'percentage'` \| `'fixed'`; validado no serviço |
| `value` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0; para `percentage` máx. 100 |
| `category` | `TEXT` | NULL | — | obrigatório quando `scope = 'category'`; ignorado nos demais escopos |
| `author` | `TEXT` | NULL | — | obrigatório quando `scope = 'author'`; ignorado nos demais escopos |
| `min_price` | `NUMERIC(10,2)` | NULL | — | obrigatório quando `scope = 'price_range'`; deve ser > 0 |
| `max_price` | `NUMERIC(10,2)` | NULL | — | obrigatório quando `scope = 'price_range'`; deve ser > `min_price` |
| `starts_at` | `TIMESTAMP` | NULL | — | opcional; ausência significa vigência imediata |
| `ends_at` | `TIMESTAMP` | NULL | — | opcional; ausência significa sem expiração automática |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | falso após remoção lógica — ver nota abaixo |
| `created_by` | `UUID` | NOT NULL | — | FK → `"user"(id)` |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado na remoção |

> A remoção de desconto é física (DELETE), não lógica, conforme regra de negócio 8 de `003-00`. O campo `active` existe no schema e pode ser usado para testes de vigência, mas a operação de remoção deve usar `DELETE` (cascata para `discount_book`). O campo `active` não é necessário para marcar remoção — seu papel é diferenciar desconto vigente de agendado ou expirado no cálculo de status.

> `scope`, `value_type`, `category` e `author` não possuem `CHECK` constraints no banco (política do schema: TEXT sem CHECK, validação no serviço). O serviço deve rejeitar valores fora do conjunto definido com `400`.

#### `discount_book`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `discount_id` | `UUID` | NOT NULL | — | FK → `discount(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| — | — | — | — | PK composta: `(discount_id, book_id)` |

> O CASCADE em `discount_id` garante que ao deletar um `discount` de escopo `book`, todos os vínculos em `discount_book` são removidos automaticamente. Não é necessário DELETE explícito no serviço para `discount_book`.

### Índices para o módulo

Os índices abaixo são específicos do módulo de descontos e devem ser adicionados em um novo changeSet (`004-discount-indexes`) para não alterar o changeSet `001-initial-schema`.

```sql
-- Listagem e resolução de descontos da filial (query principal de listagem e do PDV)
CREATE INDEX idx_discount_branch ON discount(branch_id);

-- Detecção de conflito de vigência: filtra descontos ativos por filial com intervalo de datas
-- Cobrir active + branch_id + starts_at + ends_at evita full scan na verificação de sobreposição
CREATE INDEX idx_discount_branch_active ON discount(branch_id, active, starts_at, ends_at);

-- Resolução de desconto por categoria (PDV e detecção de conflito scope=category)
CREATE INDEX idx_discount_category ON discount(branch_id, scope, category)
  WHERE scope = 'category';

-- Resolução de desconto por autor (PDV e detecção de conflito scope=author)
CREATE INDEX idx_discount_author ON discount(branch_id, scope, author)
  WHERE scope = 'author';

-- Busca de vínculos de livro para scope=book (resolução PDV e detecção de conflito)
CREATE INDEX idx_discount_book_book_id ON discount_book(book_id);
```

> O índice `idx_discount_branch_active` é crítico para a query de resolução do PDV (004-xx): ao escanear um livro, o PDV busca descontos ativos e vigentes da filial. Sem esse índice, a query faz full scan em `discount` a cada escaneamento de livro — impacto direto na latência do PDV.

### Estratégia de migração

Nenhuma tabela nova criada. As tabelas `discount` e `discount_book` já existem em `001-initial-schema`.

Novo changeSet `004-discount-indexes`: cria os cinco índices listados acima. Rollback seguro: `DROP INDEX` em cada índice sem perda de dados. Dados existentes não requerem migração.

---

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é sempre extraído do claim `branchId` do JWT — o cliente nunca informa o `branch_id` nas requisições de escrita.

---

### `POST /discounts`

Cria um novo desconto para a filial. Corresponde a `003-01.criar-desconto`.

- **Authorization:** `Administrador`, `Gerente`
- **Request body:**

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `scope` | `string` | sim | `"book"` \| `"category"` \| `"author"` \| `"price_range"` |
  | `value_type` | `string` | sim | `"percentage"` \| `"fixed"` |
  | `value` | `number` | sim | > 0; máx. 2 casas decimais; quando `value_type = "percentage"`, máx. 100 |
  | `book_ids` | `array<UUID>` | condicional | obrigatório e não vazio quando `scope = "book"`; cada UUID deve referenciar um `book.id` ativo na filial |
  | `category` | `string` | condicional | obrigatório e não vazio quando `scope = "category"`; máx. 150 caracteres |
  | `author` | `string` | condicional | obrigatório e não vazio quando `scope = "author"`; máx. 300 caracteres |
  | `min_price` | `number` | condicional | obrigatório quando `scope = "price_range"`; deve ser > 0 |
  | `max_price` | `number` | condicional | obrigatório quando `scope = "price_range"`; deve ser > `min_price` |
  | `starts_at` | `string (ISO-8601)` | não | quando informado, deve ser instante válido; pode ser no passado (desconto já vigente ao criar) |
  | `ends_at` | `string (ISO-8601)` | não | quando informado, deve ser posterior a `starts_at` (ou ao instante atual se `starts_at` ausente) |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "branch_id": "uuid",
    "scope": "book|category|author|price_range",
    "value_type": "percentage|fixed",
    "value": 0.00,
    "book_ids": ["uuid"],
    "category": "string|null",
    "author": "string|null",
    "min_price": 0.00,
    "max_price": 0.00,
    "starts_at": "ISO-8601|null",
    "ends_at": "ISO-8601|null",
    "active": true,
    "status": "active|scheduled|expired",
    "created_by": "uuid",
    "created_at": "ISO-8601"
  }
  ```

  > `book_ids` é retornado apenas quando `scope = "book"` (array de UUIDs dos livros vinculados). Nos demais escopos, o campo é ausente ou `null` na resposta. `status` é calculado no momento da resposta conforme a lógica definida em `003-02`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Desconto criado com sucesso |
  | `400` | Falha de validação: campo obrigatório ausente, tipo inválido, `value_type = "percentage"` com `value > 100`, `ends_at` anterior a `starts_at`, `min_price >= max_price`, `book_ids` vazio para `scope = "book"` |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` tentando criar desconto |
  | `404` | Algum UUID em `book_ids` não existe ou não pertence à filial |
  | `409` | Um ou mais livros afetados pelo escopo já possuem desconto ativo com vigência sobreposta |
  | `500` | Erro inesperado |

- **Edge cases:**

  - **Detecção de conflito de vigência:** antes de persistir, o serviço verifica se algum livro que seria coberto pelo novo desconto já possui desconto ativo com período de vigência sobreposto. A sobreposição é definida como: `(novo.starts_at IS NULL OR existente.ends_at IS NULL OR novo.starts_at < existente.ends_at) AND (novo.ends_at IS NULL OR existente.starts_at IS NULL OR novo.ends_at > existente.starts_at)`. Em caso de conflito, retorna `409` com a lista de livros conflitantes e os IDs dos descontos vigentes que causam o conflito.

  - **Resolução dos livros afetados por escopo:** para verificar conflito nos escopos `category`, `author` e `price_range`, o serviço consulta `book` para identificar os livros cobertos e verifica `discount_book` + `discount` para cada um. Para `scope = "price_range"`, a cobertura é determinada por `book.sale_price BETWEEN min_price AND max_price` no momento da criação — o preço é snapshot, não dinâmico.

  - **Atomicidade:** a inserção em `discount` e os vínculos em `discount_book` (para `scope = "book"`) devem ocorrer na mesma transação.

  - Para `scope != "book"`, nenhum registro é inserido em `discount_book`.

---

### `GET /discounts`

Lista os descontos da filial com status calculado. Corresponde a `003-02.listar-descontos`.

- **Authorization:** `Administrador`, `Gerente`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | aceito apenas para `Administrador`; ignorado para demais perfis |

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "scope": "book|category|author|price_range",
      "value_type": "percentage|fixed",
      "value": 0.00,
      "scope_summary": "string",
      "starts_at": "ISO-8601|null",
      "ends_at": "ISO-8601|null",
      "status": "active|scheduled|expired",
      "created_at": "ISO-8601"
    }
  ]
  ```

  > `scope_summary` é um campo calculado pelo backend que resume o escopo em texto legível: para `book` retorna o número de livros (ex.: `"3 livros"`); para `category` retorna `"Categoria: <valor>"`; para `author` retorna `"Autor: <valor>"`; para `price_range` retorna `"Faixa: R$ <min> – R$ <max>"`.

  > O campo `status` é calculado no backend com base em `active`, `starts_at` e `ends_at` no instante da requisição:
  > - `"active"` — `active = true` e `(starts_at IS NULL OR starts_at <= now())` e `(ends_at IS NULL OR ends_at > now())`
  > - `"scheduled"` — `active = true` e `starts_at > now()`
  > - `"expired"` — `ends_at IS NOT NULL AND ends_at <= now()`

  > A ordenação é aplicada no banco: ativos primeiro, depois agendados, depois expirados; dentro de cada grupo por `created_at DESC`. Isso corresponde a `ORDER BY CASE WHEN ends_at IS NOT NULL AND ends_at <= now() THEN 2 WHEN active = true AND starts_at IS NOT NULL AND starts_at > now() THEN 1 ELSE 0 END ASC, created_at DESC`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada (pode ser vazia) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` |
  | `500` | Erro inesperado |

- **Edge cases:**

  - Retorna todos os descontos da filial, incluindo expirados (histórico).
  - Lista vazia retorna `200` com array `[]`, nunca `404`.
  - `Administrador` sem `branch_id` no query param e sem `branchId` no JWT deve receber `400` — consulta sem escopo de filial é proibida.

---

### `DELETE /discounts/{id}`

Remove um desconto existente. Corresponde a `003-03.remover-desconto`.

- **Authorization:** `Administrador`, `Gerente`
- **Path param:** `id` — UUID do desconto
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Desconto removido com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa`; ou desconto pertence a outra filial |
  | `404` | UUID não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**

  - A remoção é física: executa `DELETE FROM discount WHERE id = ? AND branch_id = ?`. O `branch_id` da cláusula `WHERE` é extraído do JWT para prevenir remoção cross-filial (resultado zero linhas → `403` ou `404` dependendo da existência do registro).
  - O `ON DELETE CASCADE` em `discount_book.discount_id` garante remoção automática dos vínculos de livros — não é necessário DELETE explícito em `discount_book`.
  - O desconto pode estar em qualquer status (ativo, agendado, expirado) — todos são removíveis.
  - Após o DELETE commitado, o PDV imediatamente deixa de aplicar o desconto (próximas consultas não encontrarão o registro).

---

### `GET /discounts/active`

Resolve o desconto ativo para um livro específico. Este endpoint é destinado ao consumo pelo PDV (004-xx) no momento do escaneamento de um livro.

> Este endpoint é separado da listagem pois tem semântica e performance distintas: precisa retornar em baixíssima latência (caminho crítico do PDV) e expõe apenas o desconto calculado, não a lista administrativa.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `book_id` | `UUID` | sim | UUID do livro a ser verificado |

- **Response `200`:**

  ```json
  {
    "discount_id": "uuid",
    "scope": "book|category|author|price_range",
    "value_type": "percentage|fixed",
    "value": 0.00,
    "original_price": 0.00,
    "discounted_price": 0.00
  }
  ```

  Quando não há desconto ativo para o livro:

  ```json
  {
    "discount_id": null,
    "scope": null,
    "value_type": null,
    "value": null,
    "original_price": 0.00,
    "discounted_price": 0.00
  }
  ```

  > `discounted_price` é calculado pelo backend: para `percentage`, `original_price * (1 - value / 100)`; para `fixed`, `MAX(0, original_price - value)` — o desconto fixo nunca resulta em preço negativo.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Resposta retornada (com ou sem desconto ativo) |
  | `400` | `book_id` ausente ou não é UUID válido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` |
  | `404` | `book_id` não encontrado ou não pertence à filial |
  | `500` | Erro inesperado |

- **Edge cases:**

  - A resolução segue a seguinte precedência quando múltiplos escopos poderiam cobrir o livro: `book` > `category` > `author` > `price_range`. Apenas um desconto é retornado — o de maior precedência.
  - A regra "um desconto ativo por livro" é garantida na criação (detecção de conflito). No entanto, a resolução no PDV deve aplicar a precedência acima como defesa em profundidade.
  - A query deve verificar: `active = true` E `(starts_at IS NULL OR starts_at <= now())` E `(ends_at IS NULL OR ends_at > now())`.
  - O `branch_id` da query é sempre o do JWT — o PDV não pode consultar descontos de outras filiais.

---

## DTOs de domínio

Os DTOs abaixo cobrem os contratos de entrada e saída do módulo. São definidos como Java records no pacote `com.ciet.demo_learn.discount`.

```
DiscountCreateRequest     — body de POST /discounts
DiscountResponse          — resposta de POST /discounts (criação) e item individual
DiscountSummaryResponse   — item de GET /discounts (listagem)
ActiveDiscountResponse    — resposta de GET /discounts/active (PDV)
```

---

## Requisitos de qualidade

- [ ] I/O-bound identificado: todos os endpoints executam queries em PostgreSQL — candidatos a virtual threads (Java 25 / Project Loom, habilitado por padrão com Spring Boot 4).
- [ ] `GET /discounts/active` está no caminho crítico do PDV: deve completar em baixa latência. Os índices `idx_discount_branch_active`, `idx_discount_book_book_id`, `idx_discount_category` e `idx_discount_author` são obrigatórios antes de ativar o módulo em produção.
- [ ] GraalVM AOT: records Java são compatíveis. Entidades JPA com `@Entity` devem estar registradas em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis: nenhuma coluna em `discount` ou `discount_book` contém CPF, CNPJ, senha ou token. O campo `created_by` é UUID de usuário — não exposto diretamente nas respostas da listagem.
- [ ] Autorização por perfil coberta em todos os endpoints: `Caixa` e `Catalogador` não têm acesso aos endpoints de gestão (`POST /discounts`, `GET /discounts`, `DELETE /discounts/{id}`). `Caixa` tem acesso apenas a `GET /discounts/active` (caminho do PDV). `Catalogador` não tem acesso a nenhum endpoint deste módulo.
- [ ] Isolamento por filial verificado no backend em todos os endpoints: `branch_id` do JWT nunca é substituído pelo cliente em operações de escrita.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Criar desconto de escopo `book` com dois livros; verificar `201`, registros em `discount` e `discount_book`, e `status = "active"` na resposta.
- Criar desconto de escopo `category` sem `book_ids`; verificar que nenhum registro é inserido em `discount_book`.
- Criar desconto com `starts_at` no futuro; verificar `status = "scheduled"` na listagem.
- Criar desconto com `ends_at` no passado (para teste de histórico); verificar `status = "expired"` na listagem.
- Listar descontos; verificar que ativos aparecem primeiro, agendados depois, expirados por último, dentro de cada grupo por `created_at DESC`.
- Listar descontos de filial sem nenhum registro; verificar `200` com array `[]`.
- Remover desconto de escopo `book`; verificar `204`, ausência do registro em `discount` e ausência dos vínculos em `discount_book` (CASCADE).
- Remover desconto de escopo `category`; verificar `204` sem erro de FK.
- Consultar `GET /discounts/active?book_id=X` para livro com desconto ativo de escopo `book`; verificar `discounted_price` calculado corretamente para `percentage`.
- Consultar `GET /discounts/active?book_id=X` para livro sem desconto; verificar `discount_id: null` e `discounted_price = original_price`.
- Consultar `GET /discounts/active` para livro coberto por dois escopos simultâneos (`book` e `category`); verificar que apenas o desconto de escopo `book` é retornado (precedência).

### Casos de erro esperados

- `POST /discounts` com `value_type = "percentage"` e `value = 101` → `400`.
- `POST /discounts` com `ends_at` anterior a `starts_at` → `400`.
- `POST /discounts` com `scope = "book"` e `book_ids` vazio → `400`.
- `POST /discounts` com `scope = "price_range"` e `min_price >= max_price` → `400`.
- `POST /discounts` com `scope = "book"` e UUID de livro inexistente na filial → `404`.
- `POST /discounts` com livro já coberto por desconto ativo com período sobreposto → `409` com lista de livros conflitantes.
- `DELETE /discounts/{id}` com UUID inexistente → `404`.
- `DELETE /discounts/{id}` com UUID de desconto de outra filial → `403`.
- `GET /discounts/active` sem `book_id` → `400`.
- `GET /discounts/active` com `book_id` de livro de outra filial → `404`.

### Casos de autorização

- `Caixa` tentando `POST /discounts` → `403`.
- `Catalogador` tentando `GET /discounts` → `403`.
- `Caixa` acessando `GET /discounts/active?book_id=X` → `200`.
- `Catalogador` acessando `GET /discounts/active?book_id=X` → `403`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado em qualquer endpoint → `401`.
- `Gerente` da filial A tentando `DELETE /discounts/{id}` de desconto da filial B → `403`.

### Casos de borda das regras de negócio

- Desconto de escopo `price_range` criado para faixa R$ 20–50; livro com `sale_price = 50.00` (limite superior inclusivo) deve ser detectado em conflito se outro desconto ativo cobrir esse livro.
- Desconto com `ends_at` expirado há 1 segundo deve retornar `status = "expired"` e não deve ser retornado em `GET /discounts/active`.
- Desconto com `starts_at` daqui a 1 hora deve retornar `status = "scheduled"` e não ser considerado ativo no PDV.
- Remoção de desconto ativo; chamada imediata seguinte a `GET /discounts/active?book_id` do livro afetado deve retornar `discount_id: null`.
- Desconto de escopo `author` criado; livro do mesmo autor com preço dentro de faixa de outro desconto `price_range`; criar desconto `book` para esse livro específico deve retornar `409` listando os descontos conflitantes de ambos os escopos.

---

## Riscos técnicos e dependências

1. **Detecção de conflito para escopos `category`, `author` e `price_range` exige consulta em `book`.** A verificação precisa identificar quais livros da filial estão cobertos pelo novo escopo antes de checar conflitos em `discount`/`discount_book`. Para filiais com catálogos grandes, essa query pode ser lenta. Os índices `idx_book_branch_active`, `idx_book_branch_category` e `idx_book_author` (criados em `001-00.catalogo-livros`) cobrem a busca por categoria e autor, mas a detecção completa ainda é O(n) sobre os livros da filial para o escopo `price_range`. Aceitável para o volume esperado de livrarias de pequeno e médio porte.

2. **Regra "um desconto ativo por livro" é verificada na camada de serviço, não no banco.** Não há constraint de unicidade em `discount_book` que impeça dois descontos simultâneos para o mesmo livro. Em cenários de requisições concorrentes (duas criações simultâneas para o mesmo livro), a verificação de conflito pode falhar por race condition. Para mitigar: usar `SELECT ... FOR UPDATE` ou lock pessimista na linha do livro ao verificar conflito. Risco baixo dado o perfil de uso (Gerente cria descontos raramente), mas deve ser documentado e tratado se concorrência for identificada em produção.

3. **Dependência do PDV (004-xx) neste módulo.** O endpoint `GET /discounts/active` é consumido pelo PDV. Se o módulo de descontos for implementado antes do PDV, o endpoint deve ser disponibilizado com a query otimizada desde o início — o PDV assumirá que ele existe. A ordem de implementação recomendada é: 003-00 antes de qualquer sub-feature do 004.

4. **Precedência de escopos no PDV não está explícita no business.md.** A regra `book > category > author > price_range` foi inferida para resolver ambiguidade quando múltiplos escopos cobrem o mesmo livro — situação possível quando um livro se enquadra em `category`, `author` e `price_range` ao mesmo tempo (cada um criado em momentos diferentes, sem sobreposição de vigência entre si). A detecção de conflito na criação impede dois descontos simultâneos para o **mesmo livro** via `scope=book`, mas não impede que um `scope=category` e um `scope=author` cubram o mesmo livro se criados com escopos distintos. A precedência definida aqui resolve isso no PDV. Este ponto deve ser validado com o time de produto antes da implementação.

5. **`scope = "price_range"` usa snapshot do preço no momento da criação.** Se o preço de um livro for alterado após a criação do desconto, o livro pode sair ou entrar na faixa de cobertura do desconto sem que o sistema seja atualizado. O módulo de catálogo (001-02, edição de livro) não tem ciência dos descontos por faixa de preço. Isso implica que a resolução em `GET /discounts/active` deve sempre verificar `book.sale_price` em tempo real (não usar `discount_book` para `price_range`), enquanto a detecção de conflito na criação é um snapshot. Risco: desconto `price_range` pode cobrir mais ou menos livros do que o esperado após edições de preço. Fora do escopo desta feature; apenas documentado.
