# Etiquetas — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo responsável pela configuração de tamanhos de etiqueta e pela impressão em lote de etiquetas de preço para livros do catálogo. Toca duas camadas: persistência (tabela `label_config` já existente em `000-01.modelagem-dados`) e frontend React (rotas `/labels/sizes` e `/labels/print`).

O módulo não cria tabelas novas — `label_config` já está definida no changeSet `001-initial-schema`. Os endpoints novos são concentrados no domínio `/labels`. A seleção de livros para impressão ocorre na tela `/books` (feature `001-03.listar-livros`), que navega para `/labels/print?books=id1,id2,...`.

Domínios externos afetados ou lidos:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Modelagem (`000-01`) | `label_config` | leitura e escrita — CRUD de tamanhos |
| Filiais (`000-01`) | `branch` | leitura — escopo de filial |
| Autenticação (`000-02`) | JWT claims | leitura — perfil e `branchId` |
| Catálogo (`001-00`) | `book` | leitura — dados exibidos na etiqueta (preço, categoria, ISBN) |

Sub-features cobertas por este módulo:

| Sub-feature | Escopo |
|-------------|--------|
| `002-01.configurar-tamanhos-etiqueta` | CRUD de tamanhos na rota `/labels/sizes` |
| `002-02.imprimir-etiquetas` | Seleção de tamanho e geração do documento de impressão na rota `/labels/print` |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas**. A tabela `label_config` já existe pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### `label_config` (existente)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NULL | — | FK → `branch(id)`; `NULL` = tamanho predefinido global |
| `name` | `TEXT` | NOT NULL | — | único por filial (ver regra abaixo) |
| `width_cm` | `NUMERIC(5,2)` | NOT NULL | — | deve ser > 0; verificado na camada de serviço |
| `height_cm` | `NUMERIC(5,2)` | NOT NULL | — | deve ser > 0; verificado na camada de serviço |
| `is_default` | `BOOLEAN` | NOT NULL | `FALSE` | `TRUE` = predefinido global; `FALSE` = customizado de filial |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

> A unicidade do `name` por filial engloba dois casos distintos: (a) entre tamanhos customizados da mesma filial (`branch_id = :branchId`) e (b) entre tamanhos predefinidos globais (`branch_id IS NULL`). A constraint de unicidade é aplicada na camada de serviço, não no banco, porque a combinação `(branch_id, name)` com `branch_id` nullable não pode ser garantida por `UNIQUE` padrão no PostgreSQL sem índice parcial — ver índice abaixo.

> Tamanhos predefinidos (`is_default = true`, `branch_id = null`) são inseridos via seed de dados e nunca podem ser removidos via API. A proteção é feita no serviço antes de executar o `DELETE`.

### Índices

Os índices abaixo devem ser adicionados em um novo changeSet (`004-label-config-indexes`) para não reescrever o changeSet original.

```sql
-- Listagem de tamanhos disponíveis para uma filial (globais + da filial)
CREATE INDEX idx_label_config_branch ON label_config(branch_id);

-- Unicidade do nome entre tamanhos customizados de uma mesma filial
CREATE UNIQUE INDEX idx_label_config_name_branch
    ON label_config(branch_id, name)
    WHERE branch_id IS NOT NULL;

-- Unicidade do nome entre tamanhos predefinidos globais
CREATE UNIQUE INDEX idx_label_config_name_global
    ON label_config(name)
    WHERE branch_id IS NULL;
```

### Estratégia de migração

Nenhuma tabela nova ou coluna nova é criada. O changeSet `004-label-config-indexes` adiciona três índices sobre `label_config` existente. Rollback seguro: `DROP INDEX` nos três índices sem perda de dados.

**Seed de tamanhos predefinidos** — deve ser inserido no mesmo changeSet ou em um changeSet de seed separado (`005-label-config-seed`):

```sql
INSERT INTO label_config (id, branch_id, name, width_cm, height_cm, is_default, created_at) VALUES
  (uuidv7(), NULL, 'Pequena (3 × 5 cm)',  3.00,  5.00, TRUE, now()),
  (uuidv7(), NULL, 'Média (5 × 10 cm)',   5.00, 10.00, TRUE, now()),
  (uuidv7(), NULL, 'Grande (7 × 14 cm)',  7.00, 14.00, TRUE, now());
```

Dados existentes em `label_config` (se houver) não requerem migração — os índices são criados com `CREATE UNIQUE INDEX` e falharão se já houver duplicatas; neste caso, dados devem ser limpos antes da migração.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT; para o Administrador, pode ser fornecido via query param `branch_id`.

---

### `GET /labels/sizes`

Lista todos os tamanhos de etiqueta disponíveis para a filial: tamanhos predefinidos globais (`branch_id IS NULL`) mais tamanhos customizados da filial (`branch_id = :branchId`).

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "width_cm": 0.00,
      "height_cm": 0.00,
      "is_default": true,
      "branch_id": null
    }
  ]
  ```

  O array retorna primeiro os tamanhos predefinidos (`is_default = true`) e depois os customizados da filial (`is_default = false`), ordenados por `name ASC` dentro de cada grupo.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada (pode ser vazia para customizados; predefinidos sempre presentes) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A query combina tamanhos globais e da filial em um único resultado: `WHERE branch_id IS NULL OR branch_id = :branchId`.
  - Se o Administrador não enviar `branch_id` e `branchId` do JWT for `null`, retorna apenas os tamanhos predefinidos globais (`branch_id IS NULL`), sem erro.

---

### `POST /labels/sizes`

Cria um novo tamanho de etiqueta customizado vinculado à filial do usuário.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `name` | `string` | sim | não vazio; máx. 100 caracteres; único na filial (case-insensitive) |
  | `width_cm` | `number` | sim | > 0; máx. 2 casas decimais; máx. 999.99 |
  | `height_cm` | `number` | sim | > 0; máx. 2 casas decimais; máx. 999.99 |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "name": "string",
    "width_cm": 0.00,
    "height_cm": 0.00,
    "is_default": false,
    "branch_id": "uuid"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Tamanho criado com sucesso |
  | `400` | `name` vazio, `width_cm` ou `height_cm` ≤ 0 ou ausentes |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` |
  | `409` | Já existe tamanho com esse nome na filial (duplicata de `name`, case-insensitive) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A verificação de duplicata de `name` deve usar `ILIKE` (case-insensitive) contra a combinação de tamanhos globais e customizados da filial — não se pode criar um tamanho customizado com o mesmo nome de um tamanho predefinido.
  - `is_default` é sempre `false` neste endpoint; o campo não é aceito no body.
  - `branch_id` não é aceito no body — sempre extraído do JWT (ou query param para Administrador).
  - O Administrador deve fornecer `branch_id` como query param; ausência retorna `400` ("filial obrigatória para Administrador").

---

### `DELETE /labels/sizes/{id}`

Remove um tamanho de etiqueta customizado da filial.

> A proteção contra remoção de tamanhos predefinidos (`is_default = true`) é aplicada no serviço antes do `DELETE`. Tamanhos predefinidos nunca são removíveis via API — o frontend pode ocultar o botão "Remover" para eles, mas a proteção definitiva está no backend.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Path param:** `id` — UUID do tamanho (`label_config.id`)
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Tamanho removido com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa`; ou tamanho pertence a outra filial; ou tamanho é predefinido (`is_default = true`) |
  | `404` | UUID não encontrado em `label_config` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço deve verificar `label_config.branch_id = :branchId` antes de deletar. Se `branch_id IS NULL` (tamanho global) ou pertencer a outra filial → `403`.
  - Se `is_default = true` → `403` com mensagem explicativa ("Tamanhos predefinidos não podem ser removidos").
  - A regra de negócio 3 do `business.md` menciona "não esteja em uso ativo em uma impressão em andamento". Como a impressão é geração de documento client-side (sem estado no banco), esta condição não é verificável no backend nesta iteração — o serviço ignora essa restrição e permite a remoção mesmo que o tamanho tenha sido usado em impressões passadas.

---

### `GET /labels/print`

Retorna os dados necessários para renderização das etiquetas de um conjunto de livros. O frontend consome este endpoint ao acessar a rota `/labels/print?books=id1,id2,...` e usa os dados retornados para montar o documento de impressão no browser.

> A geração do PDF/documento de impressão é feita inteiramente no frontend (via CSS de impressão ou biblioteca JS). Este endpoint fornece apenas os dados — não gera PDF no servidor.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `books` | `string` | sim | lista de UUIDs separados por vírgula; mínimo 1; máximo 100 IDs |
  | `branch_id` | `UUID` | não | apenas para `Administrador` |

- **Response `200`:**

  ```json
  {
    "books": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "isbn": "string|null",
        "category": "string",
        "sale_price": 0.00
      }
    ]
  }
  ```

  > O campo `isbn` é necessário para geração do código de barras no frontend. A geração do código de barras (encoding EAN-13 ou Code128) é responsabilidade do frontend.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Dados retornados com sucesso (array `books` pode ser menor que a lista enviada se algum ID não for encontrado ou não pertencer à filial — ver edge cases) |
  | `400` | Parâmetro `books` ausente, vazio, ou com mais de 100 IDs; UUID malformado na lista |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço filtra os livros pela filial do usuário: `WHERE id = ANY(:ids) AND branch_id = :branchId AND active = true`. Livros que não pertençam à filial ou estejam inativos são silenciosamente omitidos do resultado (sem `404` — comportamento tolerante para lidar com seleções feitas antes de uma exclusão lógica).
  - Se nenhum livro for encontrado (todos os IDs inválidos ou de outra filial), retorna `200` com `books: []`.
  - A ordem dos livros na resposta segue a ordem dos IDs enviados no parâmetro `books` (ordenação aplicada na camada de serviço após a consulta).
  - UUIDs duplicados na lista de entrada são deduplicados antes da consulta — cada livro aparece uma única vez na resposta.

---

## DTOs de domínio

Os DTOs abaixo são definidos como Java records no pacote `com.ciet.demo_learn.labels`.

```
LabelSizeResponse        — item de GET /labels/sizes e resposta de POST /labels/sizes
                           campos: id (UUID), name (String), widthCm (BigDecimal),
                                   heightCm (BigDecimal), isDefault (boolean), branchId (UUID|null)

LabelSizeCreateRequest   — body de POST /labels/sizes
                           campos: name (String, @NotBlank, @Size(max=100)),
                                   widthCm (BigDecimal, @NotNull, @DecimalMin("0.01")),
                                   heightCm (BigDecimal, @NotNull, @DecimalMin("0.01"))

LabelPrintDataResponse   — resposta de GET /labels/print
                           campos: books (List<LabelBookItem>)

LabelBookItem            — item dentro de LabelPrintDataResponse
                           campos: id (UUID), title (String), author (String),
                                   isbn (String|null), category (String), salePrice (BigDecimal)
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? Todas as operações são consultas ao PostgreSQL — candidatas a virtual threads (habilitado por padrão no Java 25 com Spring Boot 4). `GET /labels/print` pode receber até 100 IDs numa única query `ANY(:ids)` — operação I/O simples.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records Java (`LabelSizeResponse`, `LabelSizeCreateRequest`, `LabelPrintDataResponse`, `LabelBookItem`) são compatíveis com AOT. A entidade JPA `LabelConfig` deve estar coberta por `reflect-config.json` se AOT for ativado.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna em `label_config` contém CPF, CNPJ, senha ou token. O `branch_id` é UUID sem informação pessoal.
- [ ] Autorização por perfil coberta em todos os endpoints? `Caixa` não tem acesso a nenhum endpoint deste módulo (`403` em todos). `Catalogador`, `Gerente` e `Administrador` têm acesso completo. Isolamento por filial verificado no backend para todos os endpoints de escrita e leitura contextual.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `GET /labels/sizes` como `Catalogador`; verificar que tamanhos predefinidos (`is_default = true`) e customizados da filial são retornados; predefinidos aparecem antes dos customizados.
- Criar tamanho customizado via `POST /labels/sizes` com nome, largura e altura válidos; verificar `201`, `is_default = false` e `branch_id` preenchido com a filial do usuário.
- Listar tamanhos após criação; verificar que o novo tamanho aparece na lista.
- Remover tamanho customizado via `DELETE /labels/sizes/{id}`; verificar `204` e ausência do item na listagem subsequente.
- Chamar `GET /labels/print?books=id1,id2` com IDs válidos da filial; verificar que os campos `title`, `author`, `isbn`, `category` e `sale_price` são retornados para cada livro.
- Chamar `GET /labels/print` com lista de 100 IDs; verificar que a resposta contém todos os livros encontrados.

### Casos de erro esperados

- `POST /labels/sizes` com `name` idêntico (case-insensitive) a um tamanho já existente na filial → `409`.
- `POST /labels/sizes` com `name` idêntico (case-insensitive) a um tamanho predefinido global → `409`.
- `POST /labels/sizes` com `width_cm = 0` → `400`.
- `POST /labels/sizes` com `height_cm` negativo → `400`.
- `POST /labels/sizes` com `name` vazio → `400`.
- `DELETE /labels/sizes/{id}` de tamanho predefinido (`is_default = true`) → `403` com mensagem explicativa.
- `DELETE /labels/sizes/{id}` de tamanho de outra filial → `403`.
- `DELETE /labels/sizes/{id}` com UUID inexistente → `404`.
- `GET /labels/print` sem parâmetro `books` → `400`.
- `GET /labels/print?books=` (vazio) → `400`.
- `GET /labels/print` com 101 IDs → `400`.
- `GET /labels/print` com UUID malformado na lista → `400`.

### Casos de autorização

- `Caixa` tentando `GET /labels/sizes` → `403`.
- `Caixa` tentando `POST /labels/sizes` → `403`.
- `Caixa` tentando `DELETE /labels/sizes/{id}` → `403`.
- `Caixa` tentando `GET /labels/print` → `403`.
- `Catalogador` acessando `GET /labels/sizes` → `200`.
- `Gerente` criando tamanho → `201`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado → `401`.
- Usuário da filial A tentando deletar tamanho customizado da filial B → `403`.

### Casos de borda das regras de negócio

- `GET /labels/print` com IDs de livros de outra filial misturados com IDs válidos; verificar que apenas os livros da filial correta aparecem na resposta (sem erro).
- `GET /labels/print` com todos os IDs de outra filial → `200` com `books: []`.
- `GET /labels/print` com IDs de livros `active = false`; verificar que livros inativos são omitidos silenciosamente.
- `GET /labels/print` com UUIDs duplicados; verificar que cada livro aparece uma única vez na resposta.
- `POST /labels/sizes` com nome `"MÉDIA (5 × 10 CM)"` quando existe `"Média (5 × 10 cm)"` → `409` (comparação case-insensitive).
- Administrador chamando `POST /labels/sizes` sem `branch_id` no query param → `400`.

## Riscos técnicos e dependências

1. **Dependência de `001-03.listar-livros` como ponto de entrada.** O botão "Imprimir Etiquetas" e a navegação para `/labels/print?books=...` são implementados em `001-03`. O contrato do query param (`books=id1,id2,...`) deve ser consistente entre os dois lados. O `tech.md` de `001-03` já documenta essa navegação — qualquer mudança no formato do parâmetro deve ser coordenada.

2. **Geração do código de barras é responsabilidade exclusiva do frontend.** O campo `isbn` retornado por `GET /labels/print` é usado pelo frontend para codificar o código de barras. Se o ISBN estiver nulo para um livro, o frontend deve tratar a ausência graciosamente (exibir etiqueta sem código de barras ou com placeholder). A biblioteca de geração de código de barras (ex.: `jsbarcode`, `bwip-js`) não é especificada neste módulo — é decisão de implementação do frontend.

3. **Impressão em A4 é client-side puro.** O posicionamento das etiquetas na folha A4, o número de colunas/linhas por página e o espaçamento entre etiquetas são calculados no frontend com base nas dimensões do tamanho selecionado. Erros de layout de impressão (etiquetas cortadas, desalinhadas) são responsabilidade do frontend e não do backend — o backend fornece apenas os dados e as dimensões.

4. **Unicidade de `name` com `branch_id` nullable exige índices parciais.** A constraint `UNIQUE(branch_id, name)` padrão do PostgreSQL trata `NULL` como valor distinto — duas linhas com `branch_id = NULL` e mesmo `name` passariam pela constraint. Por isso, dois índices únicos parciais (`WHERE branch_id IS NOT NULL` e `WHERE branch_id IS NULL`) são necessários. Se os índices do changeSet `004-label-config-indexes` não forem criados, a unicidade do nome entre predefinidos globais não será garantida no banco — a proteção ficará apenas na camada de serviço.

5. **Seed de tamanhos predefinidos deve ser idempotente.** O changeSet de seed deve usar `INSERT ... WHERE NOT EXISTS` ou similar para não falhar em reexecuções (ex.: ambiente de CI que reinicia o banco com as migrations). Liquibase repete o changeSet apenas se o `id` não estiver registrado na tabela `DATABASECHANGELOG`, então em condições normais não há duplicação — mas ambientes com reset manual de dados podem causar conflito com os índices únicos.
