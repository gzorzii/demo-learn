# Home e Navegação — Technical Design

**Reference:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature é de infraestrutura de navegação. Ela não define entidades de negócio próprias e não possui lógica de domínio relevante no backend — com exceção dos dois endpoints de notificação e do endpoint de listagem de filiais.

Camadas afetadas:

- **Frontend (React):** shell de navegação (menu lateral/superior), lógica de filtragem de itens de menu por perfil derivada dos claims do JWT, componente de notificações, seletor de filial para Administrator, guard de rota client-side.
- **Backend (Spring Boot):** três endpoints REST — listagem de notificações não lidas, marcação de notificação como lida, e listagem de filiais para seleção pelo Administrator. Todos validados pelo Resource Server configurado na feature 000-02.
- **Schema:** tabelas `notification` e `branch` definidas em `product/features/000-01.modelagem-dados/tech.md` — nenhuma tabela nova é criada por esta feature.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova. Esta feature opera sobre tabelas já definidas em `product/features/000-01.modelagem-dados/tech.md`:

- **`notification`** — leitura e atualização de `is_read` / `read_at`; filtro por `user_id` e `is_read`
- **`branch`** — leitura para popular o seletor de filial do Administrator

#### Colunas relevantes da tabela `notification`

| Coluna       | Tipo        | Nullable | Uso nesta feature                                      |
|--------------|-------------|----------|--------------------------------------------------------|
| `id`         | UUID        | NOT NULL | Identificador retornado e usado em PATCH/POST de leitura |
| `user_id`    | UUID        | NOT NULL | Filtro — retornar somente notificações do usuário autenticado (via `sub` do JWT) |
| `type`       | TEXT        | NOT NULL | Retornado no payload de resposta                       |
| `message`    | TEXT        | NOT NULL | Retornado no payload de resposta                       |
| `metadata`   | JSONB       | NULL     | Retornado no payload de resposta (pode ser `null`)     |
| `is_read`    | BOOLEAN     | NOT NULL | Filtro de não lidas; atualizado por `POST /{id}/read`  |
| `read_at`    | TIMESTAMPTZ | NULL     | Preenchido com `now()` ao marcar como lida             |
| `created_at` | TIMESTAMPTZ | NOT NULL | Ordenação decrescente na listagem                      |

Index existente relevante: `idx_notification_user_id` em `(user_id, is_read)` — cobre a query principal de polling.

#### Colunas relevantes da tabela `branch`

| Coluna       | Tipo        | Nullable | Uso nesta feature                          |
|--------------|-------------|----------|--------------------------------------------|
| `id`         | UUID        | NOT NULL | Retornado como identificador de filial     |
| `name`       | TEXT        | NOT NULL | Retornado para exibição no seletor         |
| `deleted_at` | TIMESTAMPTZ | NULL     | Filtro — retornar apenas filiais ativas    |

Index existente relevante: `idx_branch_deleted_at` em `(deleted_at)` — cobre o filtro de filiais ativas.

### Estratégia de migração

Nenhuma migration necessária. O schema está integralmente definido pela feature 000-01. Rollback não é aplicável.

---

## Contratos de API

### `GET /notifications`

Retorna as notificações não lidas do usuário autenticado, ordenadas da mais recente para a mais antiga. O `user_id` do filtro é extraído do claim `sub` do JWT — o usuário nunca informa seu próprio ID na requisição.

- **Autorização:** qualquer perfil autenticado (Administrator, Manager, Catalog, Cashier)
- **Request body:** nenhum
- **Query params:**

| Parâmetro | Tipo    | Obrigatório | Padrão | Regras                                 |
|-----------|---------|-------------|--------|----------------------------------------|
| `unread`  | boolean | não         | `true` | `true` retorna apenas não lidas; `false` retorna todas |
| `page`    | integer | não         | `0`    | Paginação — índice base 0              |
| `size`    | integer | não         | `20`   | Máximo de `50` por página              |

- **Response `200`:**

```json
{
  "content": [
    {
      "id": "uuid",
      "type": "string",
      "message": "string",
      "metadata": { } ,
      "isRead": false,
      "createdAt": "2026-05-06T10:00:00Z"
    }
  ],
  "unreadCount": 3,
  "page": 0,
  "size": 20,
  "totalElements": 3
}
```

`unreadCount` reflete o total de notificações com `is_read = false` do usuário, independente da paginação — é este valor que alimenta o contador no ícone de notificações.

- **Status codes:**

| Código | Quando ocorre |
|--------|---------------|
| 200    | Listagem retornada (pode ser vazia — `content: []`, `unreadCount: 0`) |
| 400    | Parâmetro de paginação inválido (e.g., `size > 50`) |
| 401    | JWT ausente, expirado ou com assinatura inválida |
| 500    | Erro inesperado |

- **Edge cases:**
  - Se o usuário não tiver nenhuma notificação, retornar `200` com lista vazia e `unreadCount: 0`.
  - O backend nunca retorna notificações de outros usuários — o `user_id` vem exclusivamente do JWT.

---

### `POST /notifications/{id}/read`

Marca uma notificação específica como lida. A operação é idempotente — marcar como lida uma notificação já lida retorna `200` sem erro.

- **Autorização:** qualquer perfil autenticado; o usuário só pode marcar suas próprias notificações
- **Path param:** `id` — UUID da notificação
- **Request body:** nenhum
- **Response `200`:**

```json
{
  "id": "uuid",
  "isRead": true,
  "readAt": "2026-05-06T10:05:00Z"
}
```

- **Status codes:**

| Código | Quando ocorre |
|--------|---------------|
| 200    | Notificação marcada como lida (ou já estava lida — idempotente) |
| 401    | JWT ausente, expirado ou com assinatura inválida |
| 403    | Notificação pertence a outro usuário |
| 404    | Notificação com o ID informado não existe |
| 500    | Erro inesperado |

- **Edge cases:**
  - O backend deve verificar que `notification.user_id` corresponde ao `sub` do JWT antes de atualizar. Se não corresponder, retornar `403` — nunca `404`, para não vazar a existência da notificação.
  - Ao marcar como lida: `is_read = true`, `read_at = now()`. Se já estava lida, não regravar `read_at` — retornar o `read_at` original.

---

### `GET /branches`

Lista todas as filiais ativas para popular o seletor de troca de contexto do Administrator. Restrito ao perfil Administrator — demais perfis têm filial fixa no JWT e não precisam deste endpoint.

- **Autorização:** somente perfil `Administrador`
- **Request body:** nenhum
- **Response `200`:**

```json
[
  {
    "id": "uuid",
    "name": "string"
  }
]
```

- **Status codes:**

| Código | Quando ocorre |
|--------|---------------|
| 200    | Lista de filiais ativas retornada (pode ser vazia) |
| 401    | JWT ausente, expirado ou com assinatura inválida |
| 403    | Perfil sem permissão (qualquer perfil que não seja `Administrador`) |
| 500    | Erro inesperado |

- **Edge cases:**
  - Retornar apenas filiais com `deleted_at IS NULL`.
  - Retornar somente `id` e `name` — sem endereço, telefone, ou outros campos de cadastro.

---

## Contrato de dados do frontend

### Mapa de permissões por seção

O frontend deriva a visibilidade dos itens de menu a partir do array `roles` do JWT, sem consultar o backend. A estrutura abaixo é a fonte de verdade para implementação do guard client-side. Os nomes de perfil correspondem exatamente aos valores de `role.name` no banco (e portanto aos valores no claim `roles` do JWT).

```typescript
// Perfis conforme role.name no banco / claims do JWT
type Role = 'Administrador' | 'Gerente' | 'Catalogador' | 'Caixa';

// Cada entrada representa uma seção navegável do sistema
type MenuSection =
  | 'book-registration'
  | 'stock-management'
  | 'labels'
  | 'pos'
  | 'discounts'
  | 'vouchers'
  | 'used-book-purchase'
  | 'customers'
  | 'reports'
  | 'shelf-tracking'
  | 'price-history'
  | 'book-search'
  | 'payment-methods'
  | 'user-access'
  | 'branch-management';

const SECTION_PERMISSIONS: Record<MenuSection, Role[]> = {
  'book-registration':    ['Administrador', 'Gerente', 'Catalogador'],
  'stock-management':     ['Administrador', 'Gerente', 'Catalogador'],
  'labels':               ['Administrador', 'Gerente', 'Catalogador'],
  'pos':                  ['Administrador', 'Gerente', 'Catalogador', 'Caixa'],
  'discounts':            ['Administrador', 'Gerente'],
  'vouchers':             ['Administrador', 'Gerente'],
  'used-book-purchase':   ['Administrador', 'Gerente'],
  'customers':            ['Administrador', 'Gerente'],
  'reports':              ['Administrador', 'Gerente'],
  'shelf-tracking':       ['Administrador', 'Gerente'],
  'price-history':        ['Administrador', 'Gerente'],
  'book-search':          ['Administrador', 'Gerente', 'Catalogador', 'Caixa'],
  'payment-methods':      ['Administrador', 'Gerente'],
  'user-access':          ['Administrador', 'Gerente'],
  'branch-management':    ['Administrador'],
};
```

Regra de aplicação: um usuário com múltiplos perfis tem acesso à seção se **ao menos um** dos seus perfis estiver listado em `SECTION_PERMISSIONS[section]`. A verificação é feita com `userRoles.some(r => SECTION_PERMISSIONS[section].includes(r))`.

### Estrutura do contexto de sessão (frontend)

O frontend deve manter em memória (context/store) os dados extraídos do JWT após autenticação:

```typescript
interface SessionContext {
  sub: string;          // user.id — usado como user_id nas chamadas de API
  name: string;
  email: string;
  roles: Role[];        // array de perfis — fonte para SECTION_PERMISSIONS
  branchId: string | null; // null para Administrator sem filial fixa
  activeBranchId: string | null; // pode diferir de branchId quando Administrator troca de filial
}
```

`activeBranchId` é inicializado com o valor de `branchId` do JWT. Quando o Administrator usa o seletor de filial, `activeBranchId` é atualizado no estado do frontend — sem reemissão do JWT. As chamadas de API que dependem do contexto de filial devem enviar `activeBranchId` como parâmetro ou header, conforme definido pelos contratos das features de negócio correspondentes.

### Guard de rota client-side

Rotas protegidas devem verificar permissão antes de renderizar. Se o usuário tentar acessar diretamente uma URL sem permissão, deve ser redirecionado para uma página de acesso negado (não para a home). O guard não consulta o backend — usa exclusivamente `roles` do JWT em memória.

---

## Requisitos de qualidade

- [x] Operações I/O-bound identificadas? — Sim: `GET /notifications` e `POST /notifications/{id}/read` fazem leitura/escrita no banco PostgreSQL; `GET /branches` faz leitura no banco. Todas são candidatas a execução em virtual thread (Project Loom / Java 25).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? — Não aplicável a esta feature especificamente; herda as considerações da feature 000-02.
- [x] Dados sensíveis tratados adequadamente? — Notificações podem conter dados de contexto em `metadata` (e.g., título de livro, nome de cliente). O campo `metadata` deve ser retornado ao frontend sem log em nível de `DEBUG` ou inferior para evitar exposição acidental. `user.password_hash` não é referenciado por nenhum endpoint desta feature.
- [x] Casos de autorização por perfil cobertos em todos os endpoints?
  - `GET /notifications`: qualquer perfil autenticado — verificado pelo Resource Server via JWT.
  - `POST /notifications/{id}/read`: qualquer perfil autenticado + verificação de ownership (`notification.user_id == JWT.sub`).
  - `GET /branches`: restrito a `Administrador` — verificado por anotação de autorização no backend (ex.: `@PreAuthorize`). A ocultação do seletor de filial no frontend é complementar, não substituta.

---

## Estratégia de testes

### `GET /notifications`

- **Happy path:** usuário autenticado com notificações não lidas → retorna lista correta com `unreadCount` exato.
- **Happy path:** usuário sem notificações → retorna `200` com `content: []` e `unreadCount: 0`.
- **Paginação:** `size=2` com 5 notificações → retorna 2 itens, `totalElements: 5`.
- **Parâmetro `unread=false`:** retorna lidas e não lidas.
- **Isolamento:** usuário A não vê notificações do usuário B — mesmo com IDs conhecidos.
- **Erro de autorização:** requisição sem JWT → `401`.
- **Erro de validação:** `size=100` (acima do máximo) → `400`.

### `POST /notifications/{id}/read`

- **Happy path:** notificação não lida pertencente ao usuário autenticado → `200`, `isRead: true`, `readAt` preenchido.
- **Idempotência:** chamar duas vezes a mesma notificação → segundo `200` retorna `readAt` original, sem alteração.
- **Ownership:** notificação pertencente a outro usuário → `403`.
- **Not found:** ID inexistente → `404`.
- **Erro de autorização:** requisição sem JWT → `401`.

### `GET /branches`

- **Happy path:** Administrator autenticado → retorna lista de filiais ativas.
- **Filial deletada:** filial com `deleted_at IS NOT NULL` não aparece na listagem.
- **Autorização — perfis sem acesso:** Manager, Catalog, Cashier → `403`.
- **Erro de autorização:** requisição sem JWT → `401`.

### Frontend — filtragem de menu por perfil

- **Cashier:** menu contém apenas `pos` e `book-search`; demais seções ausentes do DOM.
- **Catalog:** menu contém `book-registration`, `stock-management`, `labels`, `pos`, `book-search`; demais ausentes.
- **Múltiplos perfis (Catalog + Cashier):** menu exibe a união das seções permitidas para ambos.
- **Administrator:** menu exibe todas as seções, incluindo `branch-management`.
- **Acesso direto a URL sem permissão:** Cashier tentando acessar `/reports` → redirecionamento para página de acesso negado.

### Frontend — troca de filial (Administrator)

- **Happy path:** Administrator seleciona filial B → `activeBranchId` muda para ID da filial B; seletor exibe nome da filial B.
- **Persistência de sessão:** troca de filial não reemite JWT.

---

## Riscos técnicos e dependências

**1. Frequência de polling de notificações (risco médio — decisão em aberto):**
O `business.md` não define frequência. Polling muito frequente (ex.: a cada 5 segundos) gera carga desnecessária no banco, especialmente em cenários multi-filial com muitos usuários simultâneos. Polling muito esparso (ex.: a cada 60 segundos) degrada a experiência. Recomendação: iniciar com polling de 30 segundos no frontend via `setInterval`; reavaliar se WebSocket/SSE for necessário em iteração futura. A decisão deve ser registrada como configurável (constante no frontend), não hardcoded.

**2. Propagação do `activeBranchId` entre abas do browser (risco médio):**
O `activeBranchId` é estado em memória no frontend. Se o Administrator abrir múltiplas abas, cada aba terá seu próprio `activeBranchId`, podendo operar em filiais diferentes simultaneamente. Isto pode causar inconsistências (ex.: relatório gerado na aba A usa filial X, enquanto aba B usa filial Y). Opções: persistir `activeBranchId` em `sessionStorage` (escopo por aba — comportamento atual descrito) ou em `localStorage` (compartilhado entre abas — sincroniza via `storage` event). A decisão deve ser tomada antes da implementação do shell de navegação.

**3. Dependência bloqueante — feature 000-02 (autenticação):**
O shell de navegação depende do JWT emitido pela feature 000-02 para extrair `roles`, `branchId` e `sub`. Esta feature não pode ser testada de ponta a ponta sem a autenticação funcionando. Em ambiente `dev`, o bypass de login (`POST /auth/dev/login`) é suficiente para desbloquear o desenvolvimento.

**4. Dependência bloqueante — feature 000-01 (schema):**
Os endpoints `GET /notifications`, `POST /notifications/{id}/read` e `GET /branches` dependem das tabelas `notification` e `branch` existentes no banco. A migration da feature 000-01 deve ter sido executada antes de qualquer teste dos endpoints desta feature.

**5. Ausência de mecanismo de expiração/limpeza de notificações (risco baixo — fora do escopo):**
A tabela `notification` não possui `deleted_at` nem campo de expiração. Sem limpeza periódica, a tabela cresce indefinidamente. Um job de arquivamento (ex.: mover notificações lidas com mais de 90 dias) está fora do escopo desta feature mas deve ser planejado como feature de manutenção futura.

**6. Guard client-side não substitui autorização server-side (risco baixo — decisão de design):**
A ocultação de itens de menu no frontend é UX, não segurança. Um usuário com JWT válido pode fazer requisição direta a qualquer endpoint. O backend deve enforcer permissões independentemente do que o frontend exibe. Os três endpoints desta feature já cobrem isso (`@PreAuthorize` em `GET /branches`; ownership check em `POST /notifications/{id}/read`). As features de negócio (cadastro, relatórios, etc.) devem fazer o mesmo em seus próprios endpoints.
