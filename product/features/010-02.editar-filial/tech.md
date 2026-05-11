# Editar Filial — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `010-00.filiais`. Implementa a atualização dos dados cadastrais de uma filial existente e a configuração do limiar de alerta de tempo em prateleira (`days_threshold`) via `PUT /branches/{id}`.

Este documento não redefine o schema das tabelas `branch` e `shelf_threshold` — ambas especificadas em `000-01.modelagem-dados` e detalhadas em `010-00.filiais/tech.md`.

A edição opera sobre duas tabelas em uma única transação: atualiza `branch` (dados cadastrais) e realiza UPSERT em `shelf_threshold` (quando `days_threshold` for enviado no body).

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura de `branch` (busca por ID); escrita em `branch` (`UPDATE`); UPSERT em `shelf_threshold` (condicional) |
| Serviço | Validação de existência da filial; verificação de unicidade de nome; UPSERT atômico de `shelf_threshold`; registro de `configured_by` com o ID do Administrador autenticado |
| Frontend | Tela `/branches/:id/edit`; carregamento dos dados atuais via `GET /branches/{id}` (especificado em `010-03`); submissão via `PUT /branches/{id}` |

Domínios externos lidos por este fluxo:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Modelagem de dados (`000-01`) | `branch`, `shelf_threshold` | leitura e escrita |
| Autenticação (`000-02`) | JWT claim `sub` (ID do usuário), `roles` | leitura — `sub` é usado como `configured_by` no UPSERT |
| Tempo em prateleira (`012-xx`) | `shelf_threshold` | dependência de consumo — este módulo produz o valor lido por `012-xx` |

## Modelo de dados

### Novas tabelas / alterações de schema

Este fluxo **não cria tabelas novas nem altera o schema existente**.

Tabelas lidas e escritas por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `branch` | `SELECT` | busca por `id` para verificar existência e carregar dados atuais |
| `branch` | `SELECT` | verificação de unicidade de nome: `WHERE name = :novoNome AND id != :id` |
| `branch` | `UPDATE` | campos editáveis: `name`, `address`, `phone`, `active`; sempre atualiza `updated_at` |
| `shelf_threshold` | `INSERT ... ON CONFLICT (branch_id) DO UPDATE` | apenas quando `days_threshold` for enviado no body |

#### Semântica do UPSERT em `shelf_threshold`

> A constraint `UNIQUE` em `shelf_threshold.branch_id` garante que existe no máximo um registro por filial. O padrão de escrita correto é sempre `INSERT ... ON CONFLICT (branch_id) DO UPDATE SET days_threshold = :valor, configured_by = :userId, updated_at = now()`. Nunca usar `SELECT + INSERT/UPDATE` separado — isso cria race condition.

Colunas de `shelf_threshold` afetadas por este fluxo:

| Coluna | Tipo PostgreSQL | Valor na operação |
|--------|----------------|-------------------|
| `branch_id` | `UUID` | ID da filial sendo editada |
| `days_threshold` | `INTEGER` | valor enviado no body; mínimo 1 |
| `configured_by` | `UUID` | `sub` extraído do JWT (ID do Administrador autenticado) |
| `updated_at` | `TIMESTAMP` | `now()` — atualizado em toda operação de UPSERT |

### Estratégia de migração

Nenhuma migration nova é necessária. O índice `UNIQUE` em `branch.name` e a constraint `UNIQUE` em `shelf_threshold.branch_id` já estão presentes (ver `010-00.filiais/tech.md` e `000-01.modelagem-dados/tech.md`). Rollback não aplicável a esta sub-feature.

## Contratos de API

> O endpoint exige cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Apenas o perfil `Administrador` tem permissão. O ID do Administrador autenticado é extraído do claim `sub` do JWT para preencher `shelf_threshold.configured_by`.

---

### `PUT /branches/{id}`

Atualiza os dados de uma filial existente e, opcionalmente, configura o limiar de tempo em prateleira.

- **Authorization:** somente `Administrador`. Qualquer outro perfil → `403`.
- **Path param:** `id` — UUID da filial (UUID v7).

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `string` | Sim | não vazio; máximo 255 caracteres; único no sistema (diferente de outras filiais) |
  | `address` | `string` | Sim | não vazio; máximo 500 caracteres |
  | `phone` | `string \| null` | Não | máximo 50 caracteres; `null` limpa o campo |
  | `active` | `boolean` | Sim | `true` ou `false`; desativação não exclui dados vinculados |
  | `daysThreshold` | `integer \| null` | Não | se presente: inteiro positivo, mínimo 1; `null` é ignorado (não apaga o threshold existente) |

  > `PUT` exige os campos `name`, `address` e `active` sempre presentes — são os campos obrigatórios da entidade `branch`. Omiti-los resulta em `400`.

  > `daysThreshold = null` ou campo ausente: o registro existente em `shelf_threshold` não é modificado. Não existe operação de remoção do threshold nesta feature.

- **Response `200 OK`:**

  ```json
  {
    "id": "uuid",
    "name": "string",
    "address": "string",
    "phone": "string | null",
    "active": true,
    "daysThreshold": 30,
    "createdAt": "ISO-8601 timestamp",
    "updatedAt": "ISO-8601 timestamp"
  }
  ```

  > `daysThreshold` é nulo na resposta se `shelf_threshold` ainda não estiver configurado para esta filial.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `200` | Filial atualizada com sucesso |
  | `400` | Campo obrigatório ausente (`name`, `address` ou `active`); campo com valor vazio; `daysThreshold` menor que 1 ou não inteiro; campo excede tamanho máximo |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (Gerente, Catalogador, Caixa) |
  | `404` | UUID no path não encontrado na tabela `branch` |
  | `409` | `name` já está em uso por outra filial |
  | `500` | Erro inesperado |

- **Edge cases:**

  - **Desativação de filial:** `active = false` é persistido normalmente. O impacto na autenticação de usuários vinculados é tratado em `000-02.autenticacao` (filtro por `active = true` no usuário e filial). Este endpoint apenas persiste o flag.
  - **Unicidade de nome:** o índice `UNIQUE` em `branch.name` garante a invariante sem race condition. O serviço deve capturar a violação de constraint e retornar `409`.
  - **UPSERT de `shelf_threshold`:** deve ocorrer dentro da mesma transação do `UPDATE branch`. Se o UPSERT falhar, a atualização de `branch` deve ser revertida.
  - **`daysThreshold` presente e válido:** UPSERT executado com `configured_by = sub do JWT`. O campo `updated_at` de `shelf_threshold` é sempre renovado no UPSERT, independentemente do valor ser o mesmo.
  - **`daysThreshold = 0` ou negativo:** retornar `400` com mensagem descritiva.
  - **Editar filial inexistente:** verificar existência via `SELECT` antes do `UPDATE`; se não encontrada, retornar `404` antes de qualquer escrita.

- **Sequência de execução no serviço (dentro de uma transação):**

  1. Validar campos do body conforme tabela acima. Falha → `400` (antes de qualquer consulta ao banco).
  2. Buscar filial: `SELECT * FROM branch WHERE id = :id`. Se não encontrada → `404`.
  3. Verificar unicidade de nome: `SELECT id FROM branch WHERE name = :name AND id != :id`. Se encontrado → `409`.
  4. Executar `UPDATE branch SET name=?, address=?, phone=?, active=?, updated_at=now() WHERE id=?`.
  5. Se `daysThreshold` presente e `>= 1`: executar `INSERT INTO shelf_threshold (id, branch_id, days_threshold, configured_by, updated_at) VALUES (uuidv7(), :branchId, :days, :userId, now()) ON CONFLICT (branch_id) DO UPDATE SET days_threshold=?, configured_by=?, updated_at=now()`.
  6. Commit da transação.
  7. Carregar `shelf_threshold` atualizado para montar a response (ou usar os dados da operação do passo 5).
  8. Retornar `200` com `BranchWithThresholdResponse`.

---

## DTOs de domínio

| DTO | Direção | Campos |
|-----|---------|--------|
| `BranchUpdateRequest` | Request body de `PUT /branches/{id}` | `name: String`, `address: String`, `phone?: String`, `active: Boolean`, `daysThreshold?: Integer` |
| `BranchWithThresholdResponse` | Response de `PUT /branches/{id}`, `GET /branches`, `GET /branches/{id}` | `id`, `name`, `address`, `phone`, `active`, `daysThreshold` (nullable), `createdAt`, `updatedAt` |

> `BranchWithThresholdResponse` é o DTO compartilhado com `010-03.listar-filiais`. Definir em pacote comum do domínio `branch` para evitar duplicação.

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? `SELECT`, `UPDATE` em `branch` e UPSERT em `shelf_threshold` são I/O-bound — candidatos a virtual threads (Project Loom, habilitado por padrão no Java 25 + Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java (`BranchUpdateRequest`, `BranchWithThresholdResponse`) são compatíveis com AOT. Nenhuma reflexão dinâmica introduzida.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível. O campo `sub` do JWT (ID do Administrador) é usado internamente para `configured_by` — não deve ser exposto na response.
- [ ] Casos de autorização por perfil cobertos? Somente `Administrador` acessa. Qualquer outro perfil → `403`. Requisição sem token → `401`.

## Estratégia de testes

### Fluxo principal (happy path)

- Editar nome, endereço, telefone e `active` de filial existente como Administrador; verificar `200` com todos os campos atualizados e `updatedAt` renovado.
- Editar filial sem `daysThreshold` no body; verificar que `shelf_threshold` não é modificado e `daysThreshold` na response reflete o valor anterior (ou `null` se inexistente).
- Configurar `daysThreshold = 30` em filial sem threshold prévio; verificar `200` com `daysThreshold: 30` e criação do registro em `shelf_threshold`.
- Atualizar `daysThreshold` de `60` para `45` em filial com threshold existente; verificar que não há novo registro em `shelf_threshold` — apenas o existente é atualizado.
- Desativar filial (`active = false`); verificar `200` com `active: false` e que os livros/usuários vinculados permanecem no banco.
- No frontend, verificar pré-preenchimento do formulário com dados atuais da filial (carregados via `GET /branches/{id}`).
- Após edição bem-sucedida, verificar redirecionamento para `/branches`.

### Casos de erro esperados

- `PUT /branches/{id}` sem `name` → `400`.
- `PUT /branches/{id}` com `name: ""` → `400`.
- `PUT /branches/{id}` sem `address` → `400`.
- `PUT /branches/{id}` sem `active` no body → `400`.
- `PUT /branches/{id}` com `daysThreshold = 0` → `400`.
- `PUT /branches/{id}` com `daysThreshold = -1` → `400`.
- `PUT /branches/{id}` com `name` de outra filial existente → `409`.
- `PUT /branches/{id}` com UUID inexistente → `404`.

### Casos de autorização

- Perfil `Gerente` tentando `PUT /branches/{id}` → `403`.
- Perfil `Catalogador` tentando `PUT /branches/{id}` → `403`.
- Perfil `Caixa` tentando `PUT /branches/{id}` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Editar filial com o mesmo nome que ela já possui (sem alteração do nome); verificar `200` sem conflito de unicidade (a query de verificação exclui a própria filial via `id != :id`).
- Enviar `daysThreshold: null` explícito; verificar que o threshold existente não é apagado e a resposta retorna o valor atual.
- UPSERT concorrente de `shelf_threshold` para a mesma filial: apenas um deve prevalecer sem erro `500` (garantia pela constraint `UNIQUE` em `shelf_threshold.branch_id` com `ON CONFLICT DO UPDATE`).
- Verificar que `shelf_threshold.configured_by` é atualizado com o `sub` do JWT do Administrador que executou a operação.
- Cancelar o formulário no frontend; verificar redirecionamento para `/branches` sem chamada ao backend.

## Riscos técnicos e dependências

1. **Atomicidade entre `UPDATE branch` e UPSERT de `shelf_threshold`.** As duas operações devem ocorrer dentro de uma única transação Spring (`@Transactional`). Se o UPSERT de `shelf_threshold` falhar por qualquer motivo, o `UPDATE branch` deve ser revertido. Garantir que a anotação `@Transactional` abranja ambas as operações.

2. **Dependência de `GET /branches/{id}` para pré-preenchimento do formulário.** O frontend precisa carregar os dados atuais da filial antes de exibir o formulário de edição. Esse endpoint é introduzido por `010-03.listar-filiais/tech.md`. As duas sub-features devem ser entregues juntas ou `010-03` deve preceder `010-02`.

3. **Desativação de filial e cascata em autenticação.** A flag `active = false` em `branch` deve impedir que usuários vinculados autentiquem. A implementação de `000-02.autenticacao` precisa verificar se a filial do usuário está ativa além do próprio usuário. Confirmar que essa verificação existe antes de testar a desativação.

4. **`configured_by` em `shelf_threshold` referencia `user`.** O ID extraído do JWT (`sub`) deve existir na tabela `user`. Não há verificação explícita aqui (a FK do banco garante), mas se o usuário for deletado (fora do escopo) e o JWT ainda for válido, a operação de UPSERT falhará com violação de FK → `500`. Risco teórico, pois usuários não são deletados fisicamente.
