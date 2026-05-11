# Listar Filiais — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `010-00.filiais`. Expõe dois endpoints de leitura do domínio `branch`:

- `GET /branches` — listagem completa de filiais com filtro opcional por status (`active`) e dados do threshold de prateleira.
- `GET /branches/{id}` — detalhe completo de uma filial, consumido pelo formulário de edição (`010-02.editar-filial`) para pré-preenchimento.

Ambos os endpoints são somente-leitura e não modificam nenhuma tabela.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura em `branch`; LEFT JOIN com `shelf_threshold` para obter `days_threshold` quando configurado |
| Serviço | Aplicação de filtro por `active`; ordenação por `name ASC`; mapeamento para DTO com threshold nullable |
| Frontend | Tela `/branches`; filtro de status via controle de UI; botões "Nova Filial" e "Editar" por linha |

Domínios externos lidos por este módulo:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Modelagem de dados (`000-01`) | `branch`, `shelf_threshold` | leitura |
| Autenticação (`000-02`) | JWT claim `roles` | leitura — verificação de perfil Administrador |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova. Nenhuma alteração de schema. Os índices necessários estão declarados em `010-00.filiais/tech.md` (changeSet `004-branch-indexes`).

#### Query principal (listagem)

```sql
SELECT
    b.id,
    b.name,
    b.address,
    b.phone,
    b.active,
    b.created_at,
    b.updated_at,
    st.days_threshold
FROM branch b
LEFT JOIN shelf_threshold st ON st.branch_id = b.id
WHERE (:active IS NULL OR b.active = :active)
ORDER BY b.name ASC;
```

> O `LEFT JOIN` é necessário porque `shelf_threshold` é opcional — nem toda filial tem threshold configurado. Filiais sem threshold retornam `daysThreshold = null` na response.

### Estratégia de migração

Nenhuma migration nova é necessária. Rollback não aplicável.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Apenas o perfil `Administrador` tem acesso.

---

### `GET /branches`

Lista todas as filiais cadastradas, com filtro opcional por status e dados do threshold.

- **Authorization:** somente `Administrador`. Qualquer outro perfil → `403`.

- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `active` | `boolean` | Não | se `true`: apenas filiais ativas; se `false`: apenas inativas; ausente: todas |

  > Sem paginação — o volume de filiais tende a ser baixo (conforme business.md de `010-03`). A listagem retorna todos os registros em uma única resposta.

- **Response `200 OK`:**

  ```json
  [
    {
      "id": "uuid",
      "name": "Unidade Centro",
      "address": "Rua A, 10",
      "phone": "(11) 3333-4444",
      "active": true,
      "daysThreshold": 30,
      "createdAt": "2026-01-15T09:00:00Z",
      "updatedAt": "2026-03-10T14:22:00Z"
    },
    {
      "id": "uuid",
      "name": "Unidade Norte",
      "address": "Av. B, 200",
      "phone": null,
      "active": false,
      "daysThreshold": null,
      "createdAt": "2026-02-01T11:00:00Z",
      "updatedAt": "2026-04-05T08:00:00Z"
    }
  ]
  ```

  > `daysThreshold` é `null` quando a filial não possui registro em `shelf_threshold`.
  > A listagem é sempre ordenada por `name ASC`.
  > Lista vazia retorna `200` com array `[]` — não `404`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `200` | Listagem retornada com sucesso (pode ser vazia) |
  | `400` | Parâmetro `active` com valor inválido (não `true`/`false`) |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (Gerente, Catalogador, Caixa) |
  | `500` | Erro inesperado |

- **Edge cases:**

  - Lista vazia: retornar `200` com `[]` — não `404`.
  - Filtragem por `active=true` ou `active=false`: o filtro é aplicado na query SQL, não em memória.
  - Ordenação por `name ASC` é sempre aplicada, independentemente de filtro.
  - Filial sem telefone: `phone = null` na response.
  - Filial sem threshold: `daysThreshold = null` na response.

---

### `GET /branches/{id}`

Retorna o detalhe completo de uma filial. Consumido pelo formulário de edição (`/branches/:id/edit`) para pré-preenchimento dos dados atuais.

- **Authorization:** somente `Administrador`. Qualquer outro perfil → `403`.
- **Path param:** `id` — UUID da filial (UUID v7).

- **Response `200 OK`:**

  ```json
  {
    "id": "uuid",
    "name": "Unidade Centro",
    "address": "Rua A, 10",
    "phone": "(11) 3333-4444",
    "active": true,
    "daysThreshold": 30,
    "createdAt": "2026-01-15T09:00:00Z",
    "updatedAt": "2026-03-10T14:22:00Z"
  }
  ```

  > Mesmo shape de `GET /branches`, usando `BranchWithThresholdResponse`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `200` | Filial encontrada |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (Gerente, Catalogador, Caixa) |
  | `404` | UUID não encontrado na tabela `branch` |
  | `500` | Erro inesperado |

- **Edge cases:**

  - UUID sintaticamente inválido no path: o Spring deve retornar `400` (falha de conversão antes de chegar ao serviço).
  - Filial inativa: retornar normalmente com `active: false` — o Administrador deve poder visualizar e editar filiais inativas.
  - `daysThreshold` nulo: retornado como `null` quando `shelf_threshold` não existir para a filial.

---

## DTOs de domínio

| DTO | Direção | Campos |
|-----|---------|--------|
| `BranchWithThresholdResponse` | Response de `GET /branches`, `GET /branches/{id}`, `PUT /branches/{id}` | `id`, `name`, `address`, `phone` (nullable), `active`, `daysThreshold` (nullable), `createdAt`, `updatedAt` |

> `BranchWithThresholdResponse` é o DTO compartilhado com `010-02.editar-filial`. Deve ser definido uma única vez no pacote de domínio `branch` e reutilizado pelas duas sub-features.

> A rota literal `GET /branches` e a rota com path variable `GET /branches/{id}` devem ser declaradas de forma que o Spring MVC não interprete `new` (rota do formulário de cadastro, tratada pelo frontend) como UUID. Como `new` é uma rota frontend (React Router), não chega ao backend — sem conflito de roteamento.

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? As queries de listagem e detalhe com `LEFT JOIN` em `shelf_threshold` são I/O-bound — candidatas a virtual threads (Project Loom, habilitado por padrão no Java 25 + Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Record `BranchWithThresholdResponse` é compatível com AOT. Nenhuma reflexão dinâmica introduzida.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível. `phone` é informação comercial da filial.
- [ ] Casos de autorização por perfil cobertos? Somente `Administrador` acessa ambos os endpoints. Qualquer outro perfil → `403`. Requisição sem token → `401`.

## Estratégia de testes

### Fluxo principal (happy path)

- `GET /branches` como Administrador com filiais cadastradas; verificar retorno de todas as filiais ordenadas por `name ASC`, com `daysThreshold` preenchido para as que possuem `shelf_threshold` e `null` para as demais.
- `GET /branches?active=true`; verificar que apenas filiais com `active = true` são retornadas.
- `GET /branches?active=false`; verificar que apenas filiais com `active = false` são retornadas.
- `GET /branches` sem filtro; verificar que filiais ativas e inativas aparecem juntas.
- `GET /branches/{id}` com UUID de filial existente; verificar resposta completa incluindo `daysThreshold` e `active`.
- `GET /branches/{id}` de filial inativa; verificar `200` com `active: false` (Administrador pode visualizar filial inativa).
- No frontend, verificar que a listagem exibe botão "Nova Filial" e botão "Editar" por linha; botão "Editar" navega para `/branches/:id/edit`.

### Casos de erro esperados

- `GET /branches/{id}` com UUID inexistente → `404`.
- `GET /branches/{id}` com UUID sintaticamente inválido → `400`.
- `GET /branches?active=invalido` → `400`.
- `GET /branches` sem nenhuma filial cadastrada → `200` com `[]`.

### Casos de autorização

- Perfil `Gerente` tentando `GET /branches` → `403`.
- Perfil `Gerente` tentando `GET /branches/{id}` → `403`.
- Perfil `Catalogador` tentando `GET /branches` → `403`.
- Perfil `Caixa` tentando `GET /branches` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.
- No frontend, tentativa de acessar `/branches` com perfil não-Administrador → redirecionado para `/` via `RoleRoute` (conforme `000-03.home-navegacao`).

### Casos de borda das regras de negócio

- Filial com `address = null` e `phone = null`; verificar que a response retorna ambos como `null` sem erro.
- Ordenação: criar filiais com nomes "Zebra", "Alfa" e "Meia"; verificar que a listagem retorna na ordem "Alfa", "Meia", "Zebra".
- Filtragem combinada inexistente: `GET /branches?active=false` quando todas as filiais estão ativas → `200` com `[]`.

## Riscos técnicos e dependências

1. **Dependência de `GET /branches/{id}` pelo formulário de edição.** O endpoint `GET /branches/{id}` é necessário para que `010-02.editar-filial` pré-preencha o formulário. As duas sub-features devem ser entregues na mesma iteração. Sem este endpoint, o formulário de edição não pode ser montado no frontend.

2. **Performance da listagem sem paginação.** O business.md de `010-03` declara que paginação não é necessária dado o volume baixo de filiais. Se o volume crescer (cenário de rede de livrarias com dezenas de filiais), a listagem sem paginação pode se tornar um problema. Documentar a decisão de não paginar e adicionar paginação como dívida técnica se necessário.

3. **`LEFT JOIN` com `shelf_threshold` na listagem.** O join é necessário para incluir `days_threshold` em cada item da lista. Para volumes baixos de filiais, o impacto é desprezível. O índice existente na constraint `UNIQUE` de `shelf_threshold.branch_id` garante eficiência do join por `branch_id`.
