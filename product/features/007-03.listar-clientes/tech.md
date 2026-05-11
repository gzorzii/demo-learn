# Listar Clientes — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `007-00.clientes`. Expõe três endpoints do domínio `customer`:

- `GET /customers` — listagem paginada da filial com filtros combinados por nome, CPF/CNPJ e telefone.
- `GET /customers/search` — busca rápida para autocomplete, consumida por formulários do PDV (004-xx), emissão de vouchers (005-01) e compra de usados (006-01). O contrato deste endpoint foi antecipado em `005-00.vouchers/tech.md` como dependência de contrato; esta feature é a **fonte autoritativa**.
- `GET /customers/{id}` — detalhe completo do cliente, que corresponde à ficha exibida em `/clientes/:id`.

Camadas afetadas: persistência (JPA sobre PostgreSQL 18) e frontend React com rotas `/clientes` e `/clientes/:id`.

Domínios externos lidos por este módulo:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório de todos os clientes |
| Usuários / Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do ator e autorização via JWT |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova. As tabelas `customer` e `customer_wishlist` já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Esta feature adiciona índices complementares à tabela `customer` necessários para suportar as queries de filtragem e busca com `ILIKE`. O índice `idx_wishlist_customer` (em `customer_wishlist`) já foi declarado em `000-01.modelagem-dados` e **não deve ser recriado**.

#### Tabela `customer` — colunas relevantes para esta feature

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `name` | `TEXT` | NOT NULL | — | — |
| `phone` | `TEXT` | NULL | — | — |
| `address` | `TEXT` | NULL | — | — |
| `cpf_cnpj` | `TEXT` | NULL | — | único por filial (constraint aplicada no serviço) |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

> `cpf_cnpj` é armazenado sem formatação (apenas dígitos). A máscara (CPF: `000.000.000-00`, CNPJ: `00.000.000/0000-00`) é aplicada apenas no DTO de saída — nunca persistida.

### Estratégia de migração

Os índices abaixo devem ser adicionados em um novo changeSet (`003-customer-indexes`) para não modificar o changeSet `001-initial-schema`:

```sql
-- Listagem e filtragem por filial (base para todos os queries deste módulo)
CREATE INDEX idx_customer_branch ON customer(branch_id);

-- Suporte a busca parcial por nome (ILIKE) + ordenação alfabética dentro da filial
-- B-tree cobre ORDER BY name ASC; não elimina seq scan em ILIKE '%termo%',
-- mas reduz o conjunto de linhas varridas ao filtrar por branch_id primeiro.
CREATE INDEX idx_customer_branch_name ON customer(branch_id, name);

-- Suporte a busca parcial por cpf_cnpj (ILIKE) dentro da filial
CREATE INDEX idx_customer_branch_cpf_cnpj ON customer(branch_id, cpf_cnpj);

-- Suporte a busca parcial por telefone (ILIKE) dentro da filial
CREATE INDEX idx_customer_branch_phone ON customer(branch_id, phone);
```

> Índices B-tree não otimizam `ILIKE '%termo%'` (busca com prefixo coringa à esquerda). Para volumes elevados de clientes por filial, a solução definitiva é `pg_trgm` com índice `GIN`. Ver seção de riscos.

Rollback seguro: `DROP INDEX` em cada índice sem perda de dados. Dados existentes não requerem migração.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é sempre extraído do claim `branchId` do JWT — nunca fornecido pelo cliente como parâmetro de query.

> A rota `GET /customers/search` deve ser registrada **antes** de `GET /customers/{id}` no controller para evitar que o literal `search` seja interpretado como UUID. No Spring MVC, rotas literais têm precedência sobre path variables, mas é necessário verificar o comportamento com Spring Boot 4.

---

### `GET /customers`

Lista os clientes da filial do usuário autenticado com filtros opcionais e paginação. Ordenação padrão por `name ASC`.

- **Authorization:** `Gerente`, `Administrador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `name` | `string` | não | busca parcial, case-insensitive (`ILIKE '%name%'`) em `customer.name` |
  | `document` | `string` | não | busca parcial, case-insensitive (`ILIKE '%document%'`) em `customer.cpf_cnpj`; aceita dígitos parciais sem formatação |
  | `phone` | `string` | não | busca parcial, case-insensitive (`ILIKE '%phone%'`) em `customer.phone` |
  | `page` | `integer` | não | página 0-based; padrão `0` |
  | `size` | `integer` | não | itens por página; padrão `20`; máximo `100` |

  > Filtros são combinados com `AND`. Nenhum filtro ativo retorna todos os clientes da filial.

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "name": "Ana Souza",
        "cpfCnpj": "123.456.789-01",
        "phone": "(11) 99999-0000"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1
  }
  ```

  > `cpfCnpj` é retornado com máscara: 11 dígitos → formato CPF (`000.000.000-00`); 14 dígitos → formato CNPJ (`00.000.000/0000-00`). A máscara é aplicada no DTO de saída, não no banco.

  > `phone` é retornado exatamente como armazenado (sem transformação).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Listagem retornada com sucesso (pode ser vazia) |
  | `400` | Parâmetro inválido (ex.: `size` acima de `100` ou negativo) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` tentando acessar o endpoint |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Lista vazia retorna `200` com `content: []` e `totalElements: 0` — não `404`.
  - A filial é sempre extraída do JWT; clientes de outras filiais nunca aparecem no resultado, independentemente dos filtros.
  - Ordenação é sempre `name ASC`; não há parâmetro de ordenação neste endpoint.

---

### `GET /customers/search`

Busca rápida de clientes para uso em campos de autocomplete. Retorna lista simples sem paginação, limitada a 20 resultados.

> Este endpoint é consumido por múltiplos módulos: `005-01.emitir-voucher` (seleção de cliente no formulário de emissão), `006-01.registrar-compra-lote` (opcional: vincular vendedor), e PDV (`004-xx`). O contrato foi antecipado em `005-00.vouchers/tech.md` e esta feature é a implementação autoritativa. A autorização é restrita a `Gerente` e `Administrador` para o uso em backoffice; o PDV (`Caixa`) usa `GET /customers/search` no fluxo de venda — ver edge cases.

- **Authorization:** `Gerente`, `Administrador`, `Caixa`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `q` | `string` | sim | mínimo 2 caracteres; busca `ILIKE '%q%'` em `name`, `cpf_cnpj` e `phone` simultaneamente (OR entre colunas) |

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "cpfCnpj": "123.456.789-00",
      "phone": "(11) 99999-9999"
    }
  ]
  ```

  > `cpfCnpj` retornado com máscara (mesmo comportamento de `GET /customers`).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Resultados retornados (pode ser lista vazia) |
  | `400` | `q` ausente ou com menos de 2 caracteres |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` tentando acessar o endpoint |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Busca restrita aos clientes da filial do JWT — nunca retorna clientes de outras filiais.
  - Máximo de 20 resultados; sem paginação — uso exclusivo em autocomplete.
  - A busca aplica `ILIKE '%q%'` com `OR` entre as três colunas (`name`, `cpf_cnpj`, `phone`). Quando o campo `q` contiver apenas dígitos, a correspondência em `cpf_cnpj` é mais provável — não há distinção de campo pelo caller.
  - Lista vazia retorna `200` com array vazio `[]`.
  - O `Caixa` pode acessar este endpoint para localizar cliente no PDV; a mesma restrição de filial se aplica.

---

### `GET /customers/{id}`

Retorna os dados completos de um cliente. Corresponde à tela de ficha do cliente (`/clientes/:id`).

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `id` — UUID do cliente
- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "name": "Ana Souza",
    "cpfCnpj": "123.456.789-01",
    "phone": "(11) 99999-0000",
    "address": "Rua A, 10",
    "branchId": "uuid-da-filial",
    "createdAt": "2026-05-08T14:00:00Z",
    "updatedAt": "2026-05-08T14:00:00Z"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Cliente encontrado e pertence à filial do usuário |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Cliente existe mas pertence a outra filial, ou perfil `Catalogador` / `Caixa` |
  | `404` | UUID não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O backend verifica que `customer.branch_id` corresponde ao `branchId` do JWT antes de retornar. Se pertencer a outra filial, retornar `403` (não vazar existência de clientes de outras filiais).
  - `cpfCnpj` retornado com máscara.

---

## DTOs de domínio

Os DTOs abaixo cobrem todos os contratos de saída do módulo. São definidos como Java records no pacote `com.ciet.demo_learn.customer`.

```
CustomerSummaryResponse   — item de GET /customers e GET /customers/search
CustomerPageResponse      — wrapper paginado para GET /customers
CustomerDetailResponse    — resposta de GET /customers/{id}
```

> `CustomerSummaryResponse` é reutilizado tanto na listagem paginada quanto no autocomplete — o shape é idêntico (`id`, `name`, `cpfCnpj`, `phone`). `CustomerDetailResponse` adiciona `address`, `branchId`, `createdAt` e `updatedAt`.

> A máscara de `cpfCnpj` deve ser aplicada em um método utilitário compartilhado pelos três DTOs — nunca duplicar a lógica de formatação.

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Todas as queries são I/O-bound sobre PostgreSQL — candidatos a virtual threads (Project Loom, habilitado por padrão no Java 25 + Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java são compatíveis. Entidades JPA com `@Entity` devem estar registradas em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis tratados adequadamente? O campo `cpf_cnpj` é dado fiscal sensível. Deve ser mascarado no DTO de saída (formato CPF/CNPJ). **Nunca retornar `cpf_cnpj` sem máscara** em endpoints de listagem ou autocomplete. O armazenamento no banco permanece sem formatação (apenas dígitos), conforme definido em `007-00.clientes`.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `Catalogador` não acessa nenhum endpoint deste módulo. `Caixa` acessa apenas `GET /customers/search`. `Gerente` e `Administrador` acessam os três endpoints.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `GET /customers` autenticado como `Gerente`; verificar retorno de lista com `name`, `cpfCnpj` (com máscara), `phone`, `totalElements` correto, ordenação por `name ASC`.
- Aplicar filtro `name=ana`; verificar que apenas clientes com "ana" no nome (case-insensitive) retornam.
- Aplicar filtro `document=12345`; verificar que apenas clientes cujo CPF/CNPJ contém "12345" retornam.
- Aplicar filtro `phone=99999`; verificar correspondência parcial no telefone.
- Aplicar filtros combinados (`name` + `phone`); verificar que apenas registros que satisfazem ambos retornam (AND).
- Acessar `GET /customers` com filial sem clientes; verificar `200` com `content: []` e `totalElements: 0`.
- Buscar `GET /customers/search?q=silva`; verificar lista de até 20 resultados, todos da filial do JWT.
- Buscar `GET /customers/search?q=12345`; verificar correspondência em `cpf_cnpj`.
- Acessar `GET /customers/{id}` com UUID válido da filial; verificar todos os campos incluindo `address`.
- Clicar em cliente da listagem no frontend; verificar navegação para `/clientes/:id` com dados corretos.

### Casos de erro esperados

- `GET /customers/search` sem parâmetro `q` → `400`.
- `GET /customers/search?q=a` (menos de 2 caracteres) → `400`.
- `GET /customers/{id}` com UUID de cliente de outra filial → `403`.
- `GET /customers/{id}` com UUID inexistente → `404`.
- `GET /customers` com `size=200` (acima do máximo) → `400`.

### Casos de autorização

- Usuário com perfil `Catalogador` acessa `GET /customers` → `403`.
- Usuário com perfil `Catalogador` acessa `GET /customers/search` → `403`.
- Usuário com perfil `Catalogador` acessa `GET /customers/{id}` → `403`.
- Usuário com perfil `Caixa` acessa `GET /customers` → `403`.
- Usuário com perfil `Caixa` acessa `GET /customers/search` → `200` (tem permissão).
- Usuário com perfil `Caixa` acessa `GET /customers/{id}` → `403`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado em qualquer endpoint → `401`.

### Casos de borda das regras de negócio

- Filial com zero clientes: `GET /customers` deve retornar `200` com `content: []`, não `404`.
- `GET /customers/search?q=SILVA` (maiúsculas): verificar que `ILIKE` retorna clientes com "silva" em qualquer capitalização.
- `GET /customers/search` retornando exatamente 20 resultados quando há mais de 20 matches: verificar que o 21º resultado não aparece e não há mensagem de erro.
- `GET /customers/{id}` com cliente da própria filial pelo `Administrador` (que tem `branchId` no JWT): verificar `200`.
- CPF com 11 dígitos no banco: verificar máscara `000.000.000-00` na resposta. CNPJ com 14 dígitos: verificar máscara `00.000.000/0000-00`.
- `cpf_cnpj` nulo no banco: verificar que `cpfCnpj` na resposta é `null` (não lançar NPE na formatação).

## Riscos técnicos e dependências

1. **Performance de `ILIKE '%termo%'` em tabelas grandes.** A busca com prefixo coringa à esquerda (`ILIKE '%termo%'`) não usa índices B-tree de forma eficiente — o planner PostgreSQL faz sequential scan dentro do subconjunto filtrado por `branch_id`. Para filiais com até alguns milhares de clientes, o impacto é aceitável. Para volumes maiores, a solução é ativar a extensão `pg_trgm` e criar índices `GIN`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX idx_customer_name_trgm     ON customer USING GIN (name gin_trgm_ops);
   CREATE INDEX idx_customer_cpf_cnpj_trgm ON customer USING GIN (cpf_cnpj gin_trgm_ops);
   CREATE INDEX idx_customer_phone_trgm    ON customer USING GIN (phone gin_trgm_ops);
   ```
   Esses índices não fazem parte desta especificação — devem ser adicionados em iteração futura se a performance degradar. O changeSet `003-customer-indexes` deve ser projetado de forma que os índices GIN possam ser adicionados sem conflito.

2. **`GET /customers/search` é consumido pelo PDV (`Caixa`).** O business.md de `007-03` não menciona o Caixa, mas `005-00.vouchers/tech.md` e o fluxo do PDV implicam que o Caixa precisa localizar clientes. O contrato aqui permite `Caixa` neste endpoint. Se o escopo de autorização mudar (ex.: Caixa não deve ver CPF/CNPJ), será necessário um DTO específico para o perfil — adicionar campo de controle ou endpoint separado `/customers/search/pdv`.

3. **Conflito de rota `GET /customers/search` vs `GET /customers/{id}`.** A rota literal `search` deve ser declarada **antes** do path variable `{id}` no controller Spring MVC. Embora o Spring MVC resolva corretamente (literais têm precedência sobre path variables), a ordem de declaração deve ser explícita para evitar regressão em futuras refatorações do controller.

4. **Dependência de `007-01.cadastrar-cliente` e `007-02.editar-cliente`.** Os endpoints `POST /customers` e `PUT /customers/{id}` não são especificados aqui — pertencem às features correspondentes. A implementação desta feature pressupõe que a tabela `customer` já possui dados inseridos por essas features. Sem `007-01`, os endpoints de listagem retornam listas vazias (comportamento correto, sem risco de falha).

5. **`005-00.vouchers/tech.md` já documenta `GET /customers/search` como dependência.** A implementação deve garantir que o contrato aqui especificado (campo `q`, mínimo 2 caracteres, máximo 20 resultados, campos `id`/`name`/`cpfCnpj`/`phone`) seja compatível com o que o módulo de vouchers espera. Qualquer divergência exige atualização do tech.md de `005-00`.
