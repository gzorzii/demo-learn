# Cadastrar Cliente — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `007-00.clientes`. Implementa o fluxo de criação de um novo cliente via formulário frontend na rota `/clientes/novo` e o endpoint `POST /customers`.

Este documento **não redefine** o schema das tabelas `customer` e `customer_wishlist` — ambas já especificadas no changeSet `001-initial-schema` de `000-01.modelagem-dados` e documentadas em `007-00.clientes/business.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Escrita em `customer`; leitura em `branch` (validação de escopo) |
| Serviço | Validação de formato CPF/CNPJ com dígitos verificadores; verificação de unicidade por filial; extração de `branch_id` do JWT |
| Frontend | Tela `/clientes/novo`; máscara de CPF/CNPJ; redirecionamento para ficha do cliente após criação |

Domínios externos que este fluxo lê:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Autenticação (`000-02`) | JWT claim `branchId` | leitura — `branch_id` do cliente é sempre extraído do token, nunca do body |
| Filiais (`000-01`) | `branch` | leitura indireta via FK constraint |
| Vouchers (`005-xx`) | `voucher` | dependência futura — `voucher.customer_id` referencia `customer.id` |

## Modelo de dados

### Novas tabelas / alterações de schema

Este fluxo **não cria tabelas novas nem altera o schema existente**. A tabela `customer` já existe no changeSet `001-initial-schema`.

Tabela escrita por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `customer` | `INSERT` | sempre |

Colunas da tabela `customer` relevantes para este fluxo:

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK, gerado pelo banco |
| `name` | `TEXT` | NOT NULL | — | obrigatório |
| `phone` | `TEXT` | NULL | — | opcional |
| `address` | `TEXT` | NULL | — | opcional |
| `cpf_cnpj` | `TEXT` | NULL | — | unicidade verificada na camada de serviço; armazenado sem formatação (apenas dígitos) |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)`; extraído do JWT, nunca do body |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada edição |

> A regra de unicidade de `cpf_cnpj` é por filial (`branch_id`), não global. O banco não possui constraint `UNIQUE(cpf_cnpj)` sozinho. A verificação deve ser feita na camada de serviço com `SELECT id FROM customer WHERE cpf_cnpj = :cpfCnpj AND branch_id = :branchId` antes da inserção. Uma race condition entre dois cadastros simultâneos com o mesmo documento pode resultar em duplicata — para ambientes de produção, um índice único composto elimina esse risco.

### Índices necessários

O schema inicial não define índices para `customer`. Este fluxo introduz os seguintes índices para suportar a verificação de unicidade (e a listagem futura por filial):

```sql
-- Unicidade de documento por filial (verifica conflito antes do INSERT)
CREATE UNIQUE INDEX idx_customer_cpf_cnpj_branch ON customer(cpf_cnpj, branch_id);

-- Listagem e filtragem de clientes por filial (usada em 007-03.listar-clientes)
CREATE INDEX idx_customer_branch ON customer(branch_id);
```

> O índice `UNIQUE` em `(cpf_cnpj, branch_id)` é necessário para garantir a invariante de negócio sem race condition. Com ele, uma tentativa de inserção duplicada resulta em violação de constraint do banco, que o serviço deve capturar e traduzir em resposta `409`.

### Estratégia de migração

Nenhuma tabela nova é criada. Os dois índices acima devem ser adicionados em um novo changeSet Liquibase (ex.: `002-customer-indexes`). A criação de índice `UNIQUE` em coluna com dados existentes pode falhar se já houver duplicatas — em ambiente de desenvolvimento sem dados reais, o risco é nulo. Em produção futura, uma verificação prévia de duplicatas seria necessária antes de aplicar a migração. Rollback: `DROP INDEX idx_customer_cpf_cnpj_branch; DROP INDEX idx_customer_branch;`.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` é extraído do claim `branchId` do JWT. Para o perfil Administrador, cujo claim `branchId` é `null`, o `branch_id` deve ser fornecido via query param `?branch_id=` — ausência nesse caso retorna `400`.

---

### `POST /customers`

Cria um novo cliente vinculado à filial do usuário autenticado.

- **Autorização:** perfis `Gerente` e `Administrador`. Demais perfis → `403`.

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `string` | Sim | não vazio; máximo 255 caracteres |
  | `cpf_cnpj` | `string` | Sim | apenas dígitos; 11 dígitos (CPF) ou 14 dígitos (CNPJ); dígitos verificadores válidos; único na filial |
  | `phone` | `string` | Não | texto livre; máximo 20 caracteres |
  | `address` | `string` | Não | texto livre; máximo 500 caracteres |

  > `branch_id` **não é aceito no body** — extraído sempre do JWT (ou query param `?branch_id=` para Administrador). Qualquer tentativa de enviar `branch_id` no body deve ser ignorada.

- **Response `201 Created`:**

  ```json
  {
    "id": "uuid",
    "name": "string",
    "phone": "string | null",
    "address": "string | null",
    "cpf_cnpj": "string",
    "branch_id": "uuid",
    "created_at": "ISO-8601 timestamp"
  }
  ```

  O campo `cpf_cnpj` é retornado sem formatação (apenas dígitos), conforme armazenado.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `201` | Cliente criado com sucesso |
  | `400` | Campo obrigatório ausente; `cpf_cnpj` com quantidade de dígitos inválida; dígitos verificadores inválidos; Administrador sem query param `branch_id` |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (Catalogador, Caixa) |
  | `409` | CPF/CNPJ já cadastrado nesta filial |
  | `500` | Erro inesperado |

- **Edge cases:**

  - **Validação de formato CPF/CNPJ:** a camada de serviço deve validar tanto a quantidade de dígitos quanto os dígitos verificadores (algoritmo módulo 11). Formato com máscaras (pontos, traços, barras) não é aceito no body — o frontend deve remover a máscara antes de enviar. Se o campo contiver caracteres não-numéricos → `400`.
  - **Dígitos verificadores todos iguais:** CPFs como `00000000000`, `11111111111` etc. são formalmente inválidos pelo algoritmo módulo 11 e devem ser rejeitados com `400`.
  - **Unicidade por filial:** a verificação é feita consultando o banco antes da inserção. Com o índice `UNIQUE` em `(cpf_cnpj, branch_id)`, uma race condition resulta em violação de constraint — o serviço deve capturar a exceção de constraint e retornar `409` (não `500`).
  - **Administrador sem filial no JWT:** o claim `branchId` é `null` para o Administrador. O serviço deve exigir query param `?branch_id={uuid}` nesse caso; ausência → `400`.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? A operação de `SELECT` (verificação de unicidade) e `INSERT` em `customer` são I/O-bound e candidatas a virtual threads do Java 25.
- [ ] Compatibilidade GraalVM AOT? Nenhuma reflexão dinâmica introduzida. Os records de request/response (`CustomerCreateRequest`, `CustomerResponse`) devem ser anotados corretamente para serialização.
- [ ] Dados sensíveis tratados corretamente? `cpf_cnpj` é dado pessoal sensível (CPF/CNPJ). Deve ser armazenado sem formatação (somente dígitos) e nunca exposto em logs. A coluna não deve ser indexada de forma que exponha o valor em mensagens de erro de constraint — usar o índice `UNIQUE` composto `(cpf_cnpj, branch_id)` sem index name que revele o valor.
- [ ] Autorização por perfil coberta em todos os endpoints? Sim: `POST /customers` exige `Gerente` ou `Administrador`; `Catalogador` e `Caixa` recebem `403`.

## Estratégia de testes

### Fluxo principal (happy path)

- Criar cliente com todos os campos (nome, CPF válido, telefone, endereço) como Gerente; verificar resposta `201` com `branch_id` igual à filial do JWT e `cpf_cnpj` sem formatação.
- Criar cliente com dados mínimos (apenas nome e CPF) como Gerente; verificar `201` com `phone` e `address` nulos na resposta.
- Criar cliente com CNPJ válido (14 dígitos com dígitos verificadores corretos); verificar `201`.
- Criar cliente como Administrador fornecendo `?branch_id=` na query; verificar que o cliente é vinculado à filial informada, não à do JWT (`null`).

### Casos de erro esperados

- `POST /customers` sem `name` → `400`.
- `POST /customers` sem `cpf_cnpj` → `400`.
- `POST /customers` com `cpf_cnpj = "123"` (menos de 11 dígitos) → `400`.
- `POST /customers` com `cpf_cnpj = "1234567890123456"` (mais de 14 dígitos) → `400`.
- `POST /customers` com `cpf_cnpj = "12345678901"` (11 dígitos, dígitos verificadores inválidos) → `400`.
- `POST /customers` com `cpf_cnpj = "00000000000"` (todos iguais, inválido pelo algoritmo) → `400`.
- `POST /customers` com `cpf_cnpj` contendo máscara `"123.456.789-01"` → `400`.
- `POST /customers` com CPF/CNPJ já cadastrado na mesma filial → `409`.
- `POST /customers` com mesmo CPF em filial diferente → `201` (regra de unicidade é por filial).
- `POST /customers` como Administrador sem query param `?branch_id=` → `400`.

### Casos de autorização

- `Catalogador` tentando `POST /customers` → `403`.
- `Caixa` tentando `POST /customers` → `403`.
- `Gerente` acessando `POST /customers` com dados válidos → `201`.
- `Administrador` acessando `POST /customers` com `?branch_id=` válido → `201`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Duas requisições simultâneas com o mesmo CPF na mesma filial: uma deve retornar `201` e a outra `409` (unicidade garantida pelo índice composto no banco).
- CPF com 11 dígitos numéricos mas que representa sequência inválida para o algoritmo módulo 11 → `400`.
- CNPJ com 14 dígitos numéricos mas dígitos verificadores incorretos → `400`.
- `branch_id` enviado no body é silenciosamente ignorado; o cliente deve ser vinculado à filial do JWT.

## Riscos técnicos e dependências

1. **Ausência de tech.md em `007-00.clientes`:** o módulo pai não possui especificação técnica publicada. Este documento define o contrato `POST /customers` como único endpoint desta sub-feature. Os endpoints de edição (`007-02`), listagem (`007-03`) e lista de desejos (`007-04`) serão definidos em seus respectivos tech.md's — nenhum conflito de rota esperado.

2. **Índice UNIQUE a ser criado via migration:** a tabela `customer` já existe no schema inicial sem o índice `UNIQUE(cpf_cnpj, branch_id)`. A migration `002-customer-indexes` precisa ser criada e aplicada antes da implementação do serviço. Sem esse índice, a verificação de unicidade depende exclusivamente de um `SELECT` prévio, sujeito a race condition em produção.

3. **Validação de CPF/CNPJ com dígitos verificadores:** o algoritmo módulo 11 deve ser implementado no backend (não apenas no frontend). A ausência de validação no backend cria uma janela de dados inválidos se a API for acessada diretamente. A implementação deve cobrir: CPF (dois dígitos verificadores, pesos 10..2 e 11..2), CNPJ (dois dígitos verificadores, pesos 5..2,9..2 e 6..2,9..2).

4. **Dependência de `005-xx` (vouchers) e `007-04` (lista de desejos):** o `customer.id` criado por este fluxo é referenciado em `voucher.customer_id` e `customer_wishlist.customer_id`. O cadastro do cliente é pré-requisito para ambas as features, mas não há acoplamento direto de código neste fluxo de criação.

5. **Perfil Administrador sem `branchId` no JWT:** o claim é `null` para o Administrador (conforme `000-02.autenticacao/tech.md`). O serviço deve tratar esse caso explicitamente; deixar o `branch_id` como `null` no `INSERT` viola a constraint `NOT NULL` da tabela e causaria `500` em vez do `400` esperado.
