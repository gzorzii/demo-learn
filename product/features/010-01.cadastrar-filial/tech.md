# Cadastrar Filial — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `010-00.filiais`. Implementa o fluxo de criação de uma nova filial via formulário frontend na rota `/branches/new` e o endpoint `POST /branches`.

Este documento não redefine o schema das tabelas `branch` e `shelf_threshold` — ambas especificadas no changeSet `001-initial-schema` de `000-01.modelagem-dados` e detalhadas em `010-00.filiais/tech.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Escrita em `branch` (`INSERT`); sem toque em `shelf_threshold` (configurado apenas em `010-02`) |
| Serviço | Validação de campos obrigatórios; verificação de unicidade de nome; nova filial nasce com `active = true` |
| Frontend | Tela `/branches/new`; redirecionamento para `/branches` após criação bem-sucedida |

Domínios externos lidos por este fluxo:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Modelagem de dados (`000-01`) | `branch` | escrita |
| Autenticação (`000-02`) | JWT claim `roles` | leitura — verificação de perfil Administrador |

## Modelo de dados

### Novas tabelas / alterações de schema

Este fluxo **não cria tabelas novas nem altera o schema existente**. A tabela `branch` já existe no changeSet `001-initial-schema`.

Tabela escrita por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `branch` | `INSERT` | sempre |

Colunas da tabela `branch` relevantes para este fluxo:

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK, gerado pelo banco |
| `name` | `TEXT` | NOT NULL | — | obrigatório; único no sistema (índice UNIQUE declarado em `010-00.filiais/tech.md`) |
| `address` | `TEXT` | NULL | — | obrigatório para este fluxo (regra de negócio — ver business.md) |
| `phone` | `TEXT` | NULL | — | opcional |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | sempre `true` no cadastro inicial |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável; gerado pelo banco |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | gerado pelo banco na inserção |

> Apesar de `address` ser `NULL` no schema (para compatibilidade com dados futuros), esta feature exige `address` no request body como campo obrigatório. A obrigatoriedade é validada na camada de serviço, não por constraint no banco.

### Estratégia de migração

Nenhuma tabela nova é criada. O índice `UNIQUE` em `branch.name` é definido em `010-00.filiais/tech.md` (changeSet `004-branch-indexes`) e deve estar aplicado antes da implementação deste endpoint. Rollback não aplicável a esta sub-feature.

## Contratos de API

> O endpoint exige cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Apenas o perfil `Administrador` tem permissão. O Administrador não possui `branchId` no claim JWT — não há escopo de filial a resolver neste endpoint (a filial criada é nova e não pertence a nenhum usuário ainda).

---

### `POST /branches`

Cria uma nova filial no sistema.

- **Authorization:** somente `Administrador`. Qualquer outro perfil → `403`.

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `string` | Sim | não vazio; máximo 255 caracteres; único no sistema |
  | `address` | `string` | Sim | não vazio; máximo 500 caracteres |
  | `phone` | `string` | Não | máximo 50 caracteres; texto livre |

  > O campo `active` não é aceito no body — a filial sempre nasce com `active = true`. Qualquer tentativa de enviar `active` no body deve ser ignorada pelo backend.

- **Response `201 Created`:**

  ```json
  {
    "id": "uuid",
    "name": "string",
    "address": "string",
    "phone": "string | null",
    "active": true,
    "createdAt": "ISO-8601 timestamp",
    "updatedAt": "ISO-8601 timestamp"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `201` | Filial criada com sucesso |
  | `400` | Campo obrigatório ausente (`name` ou `address`); campo com valor vazio; campo excede tamanho máximo |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (Gerente, Catalogador, Caixa) |
  | `409` | Já existe uma filial com o mesmo nome |
  | `500` | Erro inesperado |

- **Edge cases:**

  - **Unicidade de nome:** a verificação é garantida pelo índice `UNIQUE` em `branch.name`. O serviço deve capturar a violação de constraint e retornar `409` com mensagem descritiva — não `500`.
  - **`active` no body:** se enviado, deve ser silenciosamente ignorado. A filial sempre é criada com `active = true`.
  - **`id` no body:** se enviado, deve ser silenciosamente ignorado. O ID é gerado pelo banco via `uuidv7()`.
  - **`address` e `phone` como strings apenas com espaços:** tratar como vazio — deve retornar `400` para `address` e ignorar para `phone` (campo opcional).

---

## DTOs de domínio

| DTO | Direção | Campos |
|-----|---------|--------|
| `BranchCreateRequest` | Request body de `POST /branches` | `name: String`, `address: String`, `phone?: String` |
| `BranchResponse` | Response de `POST /branches`, `PUT /branches/{id}`, `GET /branches`, `GET /branches/{id}` | `id`, `name`, `address`, `phone`, `active`, `createdAt`, `updatedAt` |
| `BranchWithThresholdResponse` | Response de `GET /branches` e `GET /branches/{id}` | todos os campos de `BranchResponse` + `daysThreshold?: Integer` (nulo se `shelf_threshold` não configurado) |

> `BranchResponse` é o DTO base; `BranchWithThresholdResponse` estende o contrato com o campo de threshold para listagem e edição. O `POST /branches` retorna `BranchResponse` (sem threshold, pois não é configurado no cadastro).

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? O `INSERT` em `branch` é I/O-bound — candidato a virtual threads (Project Loom, habilitado por padrão no Java 25 + Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java (`BranchCreateRequest`, `BranchResponse`) são compatíveis com AOT. Nenhuma reflexão dinâmica introduzida.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível armazenado. O campo `phone` é informação comercial da filial.
- [ ] Casos de autorização por perfil cobertos? Somente `Administrador` acessa. Gerente, Catalogador e Caixa recebem `403`. Requisição sem token recebe `401`.

## Estratégia de testes

### Fluxo principal (happy path)

- Criar filial com nome, endereço e telefone como Administrador; verificar `201` com todos os campos, `active = true`, `id` UUID não nulo.
- Criar filial com apenas nome e endereço (sem telefone); verificar `201` com `phone = null`.
- Após criação bem-sucedida, verificar que a filial aparece em `GET /branches`.
- No frontend, verificar redirecionamento para `/branches` após submissão com sucesso.

### Casos de erro esperados

- `POST /branches` sem `name` → `400`.
- `POST /branches` com `name: ""` → `400`.
- `POST /branches` sem `address` → `400`.
- `POST /branches` com `address: "   "` (apenas espaços) → `400`.
- `POST /branches` com `name` de filial já existente → `409`.
- `POST /branches` com `name` excedendo 255 caracteres → `400`.

### Casos de autorização

- Perfil `Gerente` tentando `POST /branches` → `403`.
- Perfil `Catalogador` tentando `POST /branches` → `403`.
- Perfil `Caixa` tentando `POST /branches` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Duas requisições simultâneas criando filiais com o mesmo nome: uma deve retornar `201` e a outra `409` (unicidade garantida pelo índice `UNIQUE`).
- Enviar `active: false` no body; verificar que a filial é criada com `active = true` (campo ignorado).
- Enviar `id: "algum-uuid"` no body; verificar que o ID retornado é o gerado pelo banco, não o enviado.
- Cancelar o formulário no frontend; verificar redirecionamento para `/branches` sem chamada ao backend.

## Riscos técnicos e dependências

1. **Dependência do changeSet `004-branch-indexes`.** O índice `UNIQUE` em `branch.name` deve estar aplicado antes da implementação. Sem ele, a unicidade de nome depende de `SELECT` prévio sujeito a race condition. Ver `010-00.filiais/tech.md`.

2. **`shelf_threshold` não configurado no cadastro.** O limiar de prateleira é definido em `010-02.editar-filial`. Módulos que dependem de `shelf_threshold` (ex.: `012-xx`) devem tratar a ausência de registro como filial sem threshold configurado — não como dado inválido. Comunicar essa invariante aos agentes que implementarem `012-xx`.

3. **`active` sempre `true` no cadastro.** A regra está na camada de serviço, não no banco. Se outro endpoint (fora deste módulo) permitir criação de `branch` com `active = false`, a regra será contornada. Garantir que o INSERT neste endpoint seta explicitamente `active = true` independentemente do body.
