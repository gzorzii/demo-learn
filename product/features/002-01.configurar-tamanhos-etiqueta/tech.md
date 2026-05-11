# Configurar Tamanhos de Etiqueta — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Primeira sub-feature do módulo `002-00.etiquetas`. Permite que Catalogadores, Gerentes e Administradores gerenciem os tamanhos de etiqueta disponíveis para a filial: visualizar os tamanhos predefinidos globais, criar tamanhos customizados vinculados à filial e remover tamanhos customizados quando não estão em uso.

A tabela `label_config` já existe no schema `001-initial-schema` (definido em `000-01.modelagem-dados`). Este módulo **não cria novas tabelas** — adiciona apenas índices complementares em um novo changeSet e define os contratos de API para os três endpoints desta feature.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura e escrita em `label_config`; leitura de `branch` (validação de filial) |
| Serviço | Validação de unicidade de nome por filial; bloqueio de remoção de predefinidos; verificação de uso ativo |
| Frontend | Tela `/labels/sizes`; modal/formulário inline de criação; confirmação de remoção |

Domínios externos que esta feature lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — validação de existência e escopo |
| Autenticação (`000-02`) | JWT (`roles`, `branchId`) | leitura — autorização e isolamento por filial |
| Impressão de etiquetas (`002-02`) | — | dependência futura — a verificação de "uso ativo" referencia esta feature; ver Riscos |

## Modelo de dados

### Tabela existente: `label_config`

Já criada pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. Nenhuma alteração de schema é necessária. Documenta-se a semântica das colunas para orientar a implementação desta feature.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NULL | — | FK → `branch(id)`; `NULL` indica tamanho predefinido global |
| `name` | `TEXT` | NOT NULL | — | nome descritivo do tamanho |
| `width_cm` | `NUMERIC(5,2)` | NOT NULL | — | largura em centímetros; deve ser > 0 |
| `height_cm` | `NUMERIC(5,2)` | NOT NULL | — | altura em centímetros; deve ser > 0 |
| `is_default` | `BOOLEAN` | NOT NULL | `FALSE` | `TRUE` apenas nos tamanhos predefinidos globais (`branch_id = NULL`) |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

**Invariantes críticas:**

- Tamanhos predefinidos: `is_default = TRUE` e `branch_id = NULL`. Esses registros são inseridos via seed e nunca devem ser alterados ou removidos pela API.
- Tamanhos customizados: `is_default = FALSE` e `branch_id = <uuid da filial>`. São criados e removidos pela API.
- Unicidade de nome: não há `UNIQUE` constraint no banco — a verificação é feita na camada de serviço (ver regra de negócio 4 do `business.md`). Isso permite que duas filiais distintas tenham tamanhos com o mesmo nome sem conflito de constraint.

> A ausência de `UNIQUE(branch_id, name)` no banco é intencional: tamanhos predefinidos (`branch_id = NULL`) não devem ser incluídos na verificação de unicidade por filial. Uma constraint parcial seria possível (`UNIQUE(branch_id, name) WHERE branch_id IS NOT NULL`), mas a política do schema evita constraints complexas — a validação permanece na camada de serviço.

### Estratégia de migração

Este módulo adiciona dois índices em um novo changeSet (`004-label-config-indexes`), sem alterar o changeSet `001-initial-schema`.

```sql
-- Listagem de tamanhos disponíveis para uma filial (predefinidos + customizados da filial)
CREATE INDEX idx_label_config_branch ON label_config(branch_id);

-- Verificação de unicidade de nome por filial na camada de serviço
CREATE INDEX idx_label_config_branch_name ON label_config(branch_id, name);
```

Rollback seguro: `DROP INDEX idx_label_config_branch; DROP INDEX idx_label_config_branch_name;` — sem perda de dados.

Dados existentes não requerem migração. Os índices são criados sem restrições de valor.

### Seed de tamanhos predefinidos

Os tamanhos predefinidos devem ser inseridos no mesmo changeSet `004-label-config-indexes` (ou em um changeSet separado `004-label-config-seed`):

```sql
INSERT INTO label_config (id, branch_id, name, width_cm, height_cm, is_default, created_at) VALUES
  (uuidv7(), NULL, '5 cm × 10 cm', 5.00, 10.00, TRUE, now()),
  (uuidv7(), NULL, '3 cm × 5 cm',  3.00,  5.00, TRUE, now());
```

Esses registros são imutáveis via API. A remoção ou alteração por fora do banco é responsabilidade de administração de banco de dados.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil `Administrador` (cujo `branchId` no JWT pode ser `null`), o `branch_id` deve ser fornecido como query param — ausência desse parâmetro para Administrador sem filial associada deve retornar `400`.

---

### `GET /labels/sizes`

Lista todos os tamanhos de etiqueta disponíveis para a filial: os predefinidos globais (`is_default = TRUE`, `branch_id = NULL`) mais os customizados da filial do usuário.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Lógica de consulta:**

  ```sql
  SELECT id, branch_id, name, width_cm, height_cm, is_default, created_at
  FROM   label_config
  WHERE  branch_id = :branchId
     OR  branch_id IS NULL
  ORDER BY is_default DESC, name ASC;
  ```

  Os predefinidos (`is_default = TRUE`) aparecem primeiro; dentro de cada grupo, ordenação alfabética por `name`.

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
    },
    {
      "id": "uuid",
      "name": "string",
      "width_cm": 0.00,
      "height_cm": 0.00,
      "is_default": false,
      "branch_id": "uuid"
    }
  ]
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `200` | Lista retornada (pode conter apenas predefinidos se filial sem customizados) |
  | `400` | Administrador sem `branch_id` no query param e `branchId = null` no JWT |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` tentando acessar |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Lista nunca é vazia: sempre retorna ao menos os tamanhos predefinidos.
  - `branch_id` retornado como `null` para predefinidos e como UUID para customizados — o frontend usa este campo para diferenciar os dois tipos e controlar a visibilidade do botão "Remover".

---

### `POST /labels/sizes`

Cria um novo tamanho de etiqueta customizado para a filial do usuário autenticado.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Request body:**

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `name` | `string` | sim | não vazio; máx. 150 caracteres; deve ser único dentro da filial (incluindo comparação com nomes dos predefinidos) |
  | `width_cm` | `number` | sim | > 0; máx. 2 casas decimais; máx. `999.99` |
  | `height_cm` | `number` | sim | > 0; máx. 2 casas decimais; máx. `999.99` |

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
  |--------|---------------|
  | `201` | Tamanho customizado criado com sucesso |
  | `400` | `name` vazio ou ausente; `width_cm` ou `height_cm` ≤ 0 ou ausentes; formato numérico inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` tentando criar |
  | `409` | Já existe um tamanho com o mesmo `name` na filial (customizado ou predefinido) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A verificação de unicidade do `name` deve comparar contra: (1) tamanhos customizados da filial (`branch_id = :branchId`) e (2) tamanhos predefinidos (`branch_id IS NULL`). Isso evita que um customizado tenha o mesmo nome de um predefinido, o que causaria ambiguidade na tela de seleção de tamanho durante a impressão.
  - O campo `is_default` é sempre `FALSE` para tamanhos criados via API — não é aceito no body.
  - O campo `branch_id` no registro criado é sempre o `branchId` extraído do JWT (ou query param para Administrador) — não é aceito no body.

---

### `DELETE /labels/sizes/{id}`

Remove um tamanho de etiqueta customizado da filial.

> Tamanhos predefinidos (`is_default = TRUE`) nunca podem ser removidos via API. A verificação deve ser feita antes de qualquer outra validação para retornar mensagem clara ao cliente.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Path param:** `id` — UUID do `label_config` a ser removido
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `204` | Tamanho customizado removido com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa`; ou tamanho pertence a outra filial |
  | `404` | UUID não encontrado em `label_config` |
  | `409` | Tamanho é predefinido (`is_default = TRUE`) e não pode ser removido; ou tamanho está em uso ativo em impressão em andamento (ver Riscos) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço deve verificar `label_config.branch_id = :branchId` além de `label_config.id = :id` para garantir isolamento entre filiais. Um UUID de outra filial retorna `403`, não `404`, para não revelar existência do registro.
  - A regra de negócio 3 do `business.md` menciona verificação de "uso ativo em uma impressão em andamento". A feature `002-02.imprimir-etiquetas` ainda não está especificada. Por ora, o serviço deve retornar `204` sem essa verificação, adicionando-a quando `002-02` estiver implementada. Ver seção de Riscos.

---

## DTOs de domínio

DTOs definidos como Java records no pacote `com.ciet.demo_learn.labels`.

```
LabelSizeResponse       — item da resposta de GET /labels/sizes e POST /labels/sizes
                          campos: id (UUID), name (String), widthCm (BigDecimal),
                                  heightCm (BigDecimal), isDefault (boolean), branchId (UUID, nullable)

LabelSizeCreateRequest  — body de POST /labels/sizes
                          campos: name (String, @NotBlank, @Size(max=150)),
                                  widthCm (BigDecimal, @NotNull, @DecimalMin("0.01")),
                                  heightCm (BigDecimal, @NotNull, @DecimalMin("0.01"))
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? As consultas a `label_config` são I/O-bound; candidatos a virtual threads (habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records Java (`LabelSizeResponse`, `LabelSizeCreateRequest`) são compatíveis com AOT. A entidade JPA `LabelConfig` deve estar coberta por `reflect-config.json` se AOT for ativado.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna de `label_config` contém dado pessoal, CPF, CNPJ, senha ou token. O `branch_id` é UUID sem informação pessoal.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `Caixa` não tem acesso a nenhum endpoint desta feature (→ `403`). `Catalogador`, `Gerente` e `Administrador` têm acesso completo (listar, criar, remover). O isolamento por filial é verificado no backend para todos os endpoints.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `GET /labels/sizes` autenticado como `Catalogador`; verificar que a resposta contém os tamanhos predefinidos (is_default = true, branch_id = null) e os customizados da filial.
- Criar tamanho customizado com `POST /labels/sizes` com name, width_cm e height_cm válidos; verificar `201` com `is_default = false` e `branch_id` igual à filial do JWT.
- Verificar que o novo tamanho aparece na listagem `GET /labels/sizes` após criação.
- Remover tamanho customizado com `DELETE /labels/sizes/{id}`; verificar `204`.
- Verificar que o tamanho removido não aparece mais na listagem.

### Casos de erro esperados

- `POST /labels/sizes` com `name` já existente na filial → `409`.
- `POST /labels/sizes` com `name` igual ao de um predefinido → `409`.
- `POST /labels/sizes` com `width_cm = 0` → `400`.
- `POST /labels/sizes` com `height_cm` negativo → `400`.
- `POST /labels/sizes` sem `name` → `400`.
- `DELETE /labels/sizes/{id}` em tamanho predefinido (`is_default = true`) → `409`.
- `DELETE /labels/sizes/{id}` com UUID inexistente → `404`.
- `GET /labels/sizes` como Administrador sem `branch_id` e sem `branchId` no JWT → `400`.

### Casos de autorização

- `Caixa` tentando `GET /labels/sizes` → `403`.
- `Caixa` tentando `POST /labels/sizes` → `403`.
- `Caixa` tentando `DELETE /labels/sizes/{id}` → `403`.
- `Catalogador` acessando `GET /labels/sizes` → `200`.
- `Gerente` criando tamanho customizado → `201`.
- Usuário da filial A tentando `DELETE /labels/sizes/{id}` de tamanho customizado da filial B → `403`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado em qualquer endpoint → `401`.

### Casos de borda das regras de negócio

- Criar dois tamanhos com o mesmo `name` em filiais diferentes → ambos são criados com `201` (unicidade é por filial, não global).
- Criar tamanho com `name` igual ao de predefinido em caixa diferente (case-insensitive se implementado) → verificar comportamento definido durante implementação.
- Listagem de filial sem nenhum tamanho customizado: verificar que retorna apenas os predefinidos.
- Tentativa de remover tamanho com UUID de outra filial informado na URL → `403` (não `404`).

## Riscos técnicos e dependências

1. **Verificação de uso ativo depende de `002-02.imprimir-etiquetas` (não especificada).** A regra de negócio 3 do `business.md` exige que um tamanho customizado só possa ser removido se não estiver em uso ativo em uma impressão em andamento. A feature `002-02` ainda não possui `tech.md` e o modelo de dados de impressão não está definido. Por isso, o `DELETE /labels/sizes/{id}` deve ser implementado sem essa verificação inicialmente. Quando `002-02` for especificada e implementada, o serviço de remoção deve ser estendido com a consulta de uso ativo. Risco baixo para o escopo atual — a omissão resulta em uma deleção que não deveria ocorrer durante uma impressão ativa, caso esse estado seja possível.

2. **Ausência de constraint de unicidade no banco.** A unicidade de `(branch_id, name)` é verificada somente na camada de serviço, sem `UNIQUE` constraint no PostgreSQL. Em cenário de alta concorrência (duas requisições simultâneas criando o mesmo nome), ambas podem passar pela verificação e inserir registros duplicados. O risco é muito baixo no contexto de uso (livraria, poucos usuários simultâneos), mas deve ser documentado. Uma constraint parcial `UNIQUE (branch_id, name) WHERE branch_id IS NOT NULL` pode ser adicionada numa iteração futura se o risco se materializar.

3. **Comparação de unicidade entre customizados e predefinidos.** A verificação de unicidade no `POST` deve cruzar tanto os registros com `branch_id = :branchId` quanto os com `branch_id IS NULL`. Essa query de verificação não é coberta por um índice único e percorrerá ambos os conjuntos. Para o volume esperado (poucos predefinidos e até dezenas de customizados por filial), não há risco de performance.

4. **Perfil Administrador sem `branch_id` no JWT.** O claim `branchId` é `null` para o Administrador. Todos os três endpoints devem exigir o query param `branch_id` explícito para esse perfil, sob pena de operar sem escopo de filial — o que causaria listagem de todos os customizados de todas as filiais ou escrita sem `branch_id`, violando o `NOT NULL` implícito do domínio. O serviço deve retornar `400` com mensagem clara nesse caso.
