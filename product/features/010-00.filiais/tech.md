# Filiais — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo de gestão das unidades físicas (filiais) da livraria. Abrange cadastro, edição e listagem de filiais, além da configuração do limiar de tempo em prateleira (`shelf_threshold`) por filial.

Todas as tabelas deste módulo já existem no changeSet `001-initial-schema` definido em `000-01.modelagem-dados`. Este módulo não introduz tabelas novas — opera exclusivamente sobre `branch` (escrita e leitura) e `shelf_threshold` (escrita via UPSERT e leitura).

O `branch_id` é a chave de escopo de todos os outros módulos do sistema (`book`, `book_stock`, `customer`, `discount`, `payment_method`, `voucher`, `sale`, `used_book_purchase`, `customer_wishlist`, `shelf_threshold`, `notification`). Por isso, a desativação de uma filial nunca exclui registros vinculados — apenas impede a autenticação dos usuários associados.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura e escrita em `branch`; UPSERT em `shelf_threshold` |
| Serviço | Validação de unicidade de nome; verificação de existência por ID; lógica de UPSERT para `shelf_threshold` |
| Frontend | Rotas `/branches`, `/branches/new`, `/branches/:id/edit`; acesso exclusivo para Administrador |

Domínios externos referenciados:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Modelagem de dados (`000-01`) | `branch`, `shelf_threshold` | escrita e leitura — tabelas já definidas |
| Autenticação (`000-02`) | JWT claim `sub`, `roles` | leitura — verificação de perfil Administrador |
| Home e navegação (`000-03`) | `modulePermissions['branches']` | leitura — módulo visível somente para Administrador |
| Usuários (`009-xx`) | `user.branch_id` | dependência indireta — desativação de filial afeta autenticação dos usuários vinculados |
| Tempo em prateleira (`012-xx`) | `shelf_threshold.days_threshold` | dependência — este módulo é o produtor do valor lido por `012-xx` |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas nem altera o schema existente**. As tabelas abaixo já estão definidas no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### Tabela `branch`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK, gerado pelo banco |
| `name` | `TEXT` | NOT NULL | — | unicidade verificada na camada de serviço |
| `address` | `TEXT` | NULL | — | opcional |
| `phone` | `TEXT` | NULL | — | opcional |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | flag de ativação; desativação não exclui dados |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável após criação |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada edição |

#### Tabela `shelf_threshold`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK, gerado pelo banco |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)`, UNIQUE — no máximo um registro por filial |
| `days_threshold` | `INTEGER` | NOT NULL | — | mínimo 1; inteiro positivo |
| `configured_by` | `UUID` | NOT NULL | — | FK → `user(id)` — ID do Administrador que configurou |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada UPSERT |

> A constraint `UNIQUE` em `shelf_threshold.branch_id` garante que existe no máximo um registro por filial. A operação de gravação deve ser sempre um UPSERT: `INSERT ... ON CONFLICT (branch_id) DO UPDATE`. Nunca realizar um `SELECT + INSERT/UPDATE` separado, pois isso cria race condition.

### Estratégia de migração

Nenhuma migration nova é necessária. Ambas as tabelas existem no changeSet `001-initial-schema`. Não há dados a migrar.

### Índices necessários

Os índices abaixo devem ser adicionados em um novo changeSet Liquibase (`004-branch-indexes`) para suportar as queries deste módulo:

```sql
-- Unicidade de nome de filial (verifica conflito antes de INSERT/UPDATE)
-- Sem este índice, a verificação de unicidade depende de SELECT prévio sujeito a race condition.
CREATE UNIQUE INDEX idx_branch_name ON branch(name);

-- Filtragem por status ativo/inativo na listagem (010-03.listar-filiais)
CREATE INDEX idx_branch_active ON branch(active);
```

> O índice `UNIQUE` em `branch.name` é necessário para garantir a invariante de unicidade de nome sem race condition. O serviço deve capturar a exceção de constraint e traduzir em `409`.

Rollback: `DROP INDEX idx_branch_name; DROP INDEX idx_branch_active;` — sem perda de dados.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Apenas o perfil `Administrador` tem acesso a qualquer endpoint deste módulo. O Administrador não possui `branchId` no claim JWT (`null`) — não há ambiguidade de escopo de filial neste módulo, pois o Administrador gerencia todas as filiais.

Os contratos detalhados de cada endpoint estão especificados nos tech.md das sub-features:

| Endpoint | Sub-feature |
|----------|-------------|
| `POST /branches` | `010-01.cadastrar-filial/tech.md` |
| `PUT /branches/{id}` | `010-02.editar-filial/tech.md` |
| `GET /branches` | `010-03.listar-filiais/tech.md` |
| `GET /branches/{id}` | `010-03.listar-filiais/tech.md` |

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Todas as operações de leitura e escrita em `branch` e `shelf_threshold` são I/O-bound — candidatas a virtual threads (Project Loom, habilitado por padrão no Java 25 + Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Nenhuma reflexão dinâmica introduzida. DTOs definidos como records Java são compatíveis.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível (CPF, senha, token) é armazenado nas tabelas deste módulo. O campo `phone` da filial é informação comercial, não pessoal — tratamento padrão.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? Somente `Administrador` acessa o módulo. Qualquer outro perfil deve receber `403`.

## Estratégia de testes

### Fluxo principal (happy path)

- Criar filial com nome, endereço e telefone como Administrador; verificar resposta `201` com `active = true` e `created_at` preenchido.
- Criar filial com apenas nome (campos opcionais ausentes); verificar `201` com `address` e `phone` nulos.
- Editar nome, endereço, telefone e `active` de filial existente; verificar resposta `200` com dados atualizados.
- Configurar `days_threshold` em filial sem `shelf_threshold` prévio; verificar criação do registro.
- Atualizar `days_threshold` em filial que já possui `shelf_threshold`; verificar que não é criado novo registro — apenas o existente é atualizado.
- Listar todas as filiais; verificar retorno de todas as filiais (ativas e inativas), ordenadas por `name ASC`.
- Filtrar listagem por `active=true`; verificar que apenas filiais ativas aparecem.
- Filtrar listagem por `active=false`; verificar que apenas filiais inativas aparecem.

### Casos de erro esperados

- Criar filial com nome duplicado → `409`.
- Editar filial usando nome de outra filial existente → `409`.
- Editar filial com ID inexistente → `404`.
- Criar filial sem `name` → `400`.
- Configurar `days_threshold = 0` → `400`.
- Configurar `days_threshold = -5` → `400`.

### Casos de autorização

- Qualquer endpoint com perfil `Gerente` → `403`.
- Qualquer endpoint com perfil `Catalogador` → `403`.
- Qualquer endpoint com perfil `Caixa` → `403`.
- Qualquer endpoint sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Desativar filial (`active = false`); verificar que os registros vinculados (usuários, livros, estoque) permanecem no banco.
- Duas requisições simultâneas tentando criar filiais com o mesmo nome: uma deve retornar `201` e a outra `409` (garantia pelo índice UNIQUE em `branch.name`).
- UPSERT concorrente de `shelf_threshold` para a mesma filial: apenas um deve prevalecer sem erro `500` (garantia pela constraint UNIQUE em `shelf_threshold.branch_id` com `ON CONFLICT DO UPDATE`).

## Riscos técnicos e dependências

1. **`branch_id` como FK em praticamente todos os módulos.** Qualquer modificação estrutural na tabela `branch` (ex.: adição de colunas) requer atenção ao impacto em joins existentes. Risco baixo para este módulo (não há remoção de colunas).

2. **Índice UNIQUE em `branch.name` a ser criado via migration.** A tabela `branch` já pode ter sido criada sem esse índice. Se houver filiais com nomes duplicados criadas antes da migration, a criação do índice falhará. Em ambiente de desenvolvimento sem dados reais, o risco é nulo.

3. **Desativação de filial e impacto na autenticação.** A regra de que usuários de filial inativa não conseguem autenticar é aplicada em `000-02.autenticacao` (filtro `active = true` na tabela `user` + verificação da filial). Garantir que a lógica de autenticação já trata esse caso antes de habilitar a desativação de filiais em produção.

4. **Dependência de `012-xx` (tempo em prateleira).** O campo `days_threshold` configurado aqui é consumido pelo módulo de tempo em prateleira para calcular alertas. A ausência de configuração (`shelf_threshold` inexistente para uma filial) deve ser tratada em `012-xx` como ausência de threshold configurado — não como erro neste módulo.
