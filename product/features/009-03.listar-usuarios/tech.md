# Listar Usuários — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `009-00.usuarios`. Implementa a tela de listagem de usuários na rota `/users` e o endpoint `GET /users`, que é o ponto de entrada para as ações de cadastro (`009-01`) e edição (`009-02`) de usuários.

Este documento **não redefine** o schema das tabelas `user`, `user_role`, `role` e `branch` — todas especificadas no changeSet `001-initial-schema` de `000-01.modelagem-dados` e documentadas em `009-00.usuarios/tech.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura de `user`, `user_role`, `role` e `branch` (JOIN para nome da filial) |
| Serviço | Aplicação de escopo por filial conforme perfil do ator; aplicação de filtros combinados; paginação |
| Frontend | Tela `/users`; ocultação do filtro de filial para Gerente; botão "Novo Usuário" → `/users/new`; botão "Editar" por linha → `/users/:id/edit` |

Domínios externos que este fluxo lê:

| Domínio | Tabela / recurso | Direção |
|---------|-----------------|---------|
| Autenticação (`000-02`) | JWT claims `branchId`, `roles` | leitura — definição de escopo de filial |
| Modelagem inicial (`000-01`) | `branch` | leitura — JOIN para obter `branch.name` na resposta |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este fluxo **não cria tabelas novas nem altera o schema existente**. Os índices necessários para as queries deste fluxo estão especificados em `009-00.usuarios/tech.md` (changeSet `008-user-indexes`):

- `idx_user_branch` — filtro por filial (Gerente)
- `idx_user_active` — filtro padrão por status ativo
- `idx_user_branch_active` — combinação dos dois filtros mais comuns

### Estratégia de migração

Nenhuma tabela nova é criada nesta sub-feature. Os índices necessários são definidos no changeSet `008-user-indexes` de `009-00.usuarios/tech.md`. Este changeSet deve ser aplicado antes do deployment de qualquer sub-feature do módulo `009`.

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O escopo de filial é extraído do claim `branchId` do JWT. Gerente só enxerga usuários da própria filial; parâmetro `branchId` é ignorado para Gerente.

---

### `GET /users`

Lista os usuários do sistema com filtros opcionais.

- **Authorization:** perfis `Administrador`, `Gerente`. Demais perfis → `403`.
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `branchId` | `UUID` | não | somente para Administrador; ignorado para Gerente (escopo fixo do JWT); filtra usuários com `user.branch_id = branchId` |
  | `role` | `String` | não | filtra usuários que possuem ao menos um registro em `user_role` com o perfil informado; valores aceitos: `"Administrador"`, `"Gerente"`, `"Catalogador"`, `"Caixa"`; valor não reconhecido → `400` |
  | `active` | `Boolean` | não | padrão `true`; `true` retorna apenas ativos; `false` retorna apenas inativos |
  | `page` | `Integer` | não | padrão `0`; base 0 |
  | `size` | `Integer` | não | padrão `20`; máximo `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "name": "Ana Costa",
        "email": "ana@livraria.com",
        "roles": ["Caixa"],
        "branchId": "uuid-da-filial",
        "branchName": "Filial Sul",
        "active": true
      },
      {
        "id": "uuid",
        "name": "Carlos Admin",
        "email": "carlos@livraria.com",
        "roles": ["Administrador"],
        "branchId": null,
        "branchName": null,
        "active": true
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Listagem retornada com sucesso (pode ser vazia) |
  | 400 | Valor não reconhecido no parâmetro `role` |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Filtros são aplicados com `AND`: todos os parâmetros informados devem ser satisfeitos simultaneamente.
  - O Gerente sempre recebe somente usuários com `user.branch_id` igual ao seu `branchId` do JWT, independente de qualquer parâmetro enviado.
  - O Administrador sem parâmetro `branchId` recebe usuários de **todas** as filiais, incluindo usuários Administradores com `branch_id = null`.
  - Resultado vazio retorna `200` com `content: []` — nunca `404`.
  - Ordenação padrão: `name ASC`.
  - O campo `branchName` é obtido via JOIN com `branch.name`. Para usuários com `branch_id = null` (Administradores), `branchId` e `branchName` são `null` na resposta.
  - O campo `roles` da resposta contém todos os perfis do usuário (JOIN com `user_role` e `role`), não apenas o filtrado pelo parâmetro `role`.
  - A query deve usar `LEFT JOIN` com `branch` para incluir usuários Administradores sem filial (`branch_id = null`) quando o Administrador lista todos os usuários.

> **Nota de performance:** a query combina JOIN entre `user`, `user_role`, `role` e `branch`. O filtro por `active` e `branch_id` deve usar os índices `idx_user_branch_active` e `idx_user_active`. O agrupamento dos perfis de cada usuário deve ser feito na camada de serviço (ou via subquery) para evitar N+1 queries. Recomenda-se carregar os perfis via JOIN e agregar no DTO, não via múltiplos SELECTs separados.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? A listagem envolve query com JOIN entre quatro tabelas mais paginação — operação I/O-bound; candidata a virtual thread (Java 25, padrão com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records `UserSummaryResponse` e `UserPageResponse` devem estar registrados para reflexão se AOT habilitado.
- [ ] Dados sensíveis tratados adequadamente? E-mail dos usuários é retornado na listagem — acesso restrito a perfis `Administrador` e `Gerente`. Nunca logar o conteúdo da resposta em nível `INFO` ou superior.
- [ ] Casos de autorização por perfil cobertos? `GET /users` exige `Administrador` ou `Gerente`; `Catalogador` e `Caixa` recebem `403`. Isolamento por filial para Gerente é aplicado no backend (não apenas no frontend).

---

## Estratégia de testes

### Fluxo principal (happy path)

- Listar como Gerente sem filtros: verificar que apenas usuários da filial do Gerente são retornados e que `active: true` é o padrão.
- Listar como Administrador sem filtros: verificar que usuários de todas as filiais aparecem, incluindo Administradores com `branchId: null`.
- Listar como Administrador com `branchId` de uma filial específica: verificar que apenas usuários dessa filial aparecem.
- Listar com filtro `role=Caixa`: verificar que apenas usuários com esse perfil aparecem; verificar que o campo `roles` na resposta contém todos os perfis do usuário, não apenas `Caixa`.
- Listar com filtro `active=false`: verificar que apenas usuários inativos aparecem.
- Listar com filtros combinados `role=Gerente&active=true`: verificar interseção dos resultados.
- Listar sem usuários correspondentes ao filtro: verificar `200` com `content: []`.
- Verificar ordenação padrão: retorno deve estar ordenado por `name ASC`.
- Verificar paginação: `page=0&size=2` deve retornar no máximo 2 registros e `totalElements` correto.

### Casos de erro esperados

- `GET /users` com `role=PerfilInexistente` → `400`.
- `GET /users` sem autenticação → `401`.
- `GET /users` com JWT expirado → `401`.
- `GET /users` por `Catalogador` → `403`.
- `GET /users` por `Caixa` → `403`.

### Casos de autorização

- Gerente acessando `GET /users` sem `branchId`: verificar que somente usuários da filial do Gerente são retornados (nunca usuários de outras filiais, nem Administradores sem filial).
- Gerente enviando `branchId` de outra filial como query param: verificar que o parâmetro é ignorado e o escopo é a filial do Gerente.
- Administrador acessando `GET /users` sem filtros: verificar que todos os usuários (incluindo os sem filial) são retornados.

### Casos de borda das regras de negócio

- Usuário com múltiplos perfis (`["Gerente", "Catalogador"]`) aparece na listagem filtrada por `role=Gerente`: verificar que o campo `roles` na resposta contém ambos os perfis.
- Usuário com múltiplos perfis aparece na listagem filtrada por `role=Catalogador`: verificar que o mesmo usuário aparece e o campo `roles` contém ambos os perfis.
- Paginação: verificar que `totalElements` corresponde ao total de registros que satisfazem os filtros, não ao tamanho da página.
- Listagem com Administrador sem filial (`branch_id = null`): verificar que `branchId` e `branchName` são `null` no item da resposta.

---

## Riscos técnicos e dependências

1. **N+1 queries ao carregar perfis.** A query de listagem deve evitar SELECT por usuário para obter `user_role`. A abordagem correta é um único SELECT com JOIN entre `user`, `user_role` e `role`, agrupando os perfis por `user.id` na camada de serviço (via `Map<UUID, List<String>>`) antes de montar os DTOs. Sem essa otimização, uma listagem de 20 usuários resulta em 21 queries.

2. **LEFT JOIN obrigatório para Administradores sem filial.** A query deve usar `LEFT JOIN branch ON user.branch_id = branch.id` para incluir registros com `branch_id = null` (Administradores). Um `INNER JOIN` excluiria esses usuários silenciosamente.

3. **Isolamento por filial para Gerente é responsabilidade do backend.** O frontend pode omitir o filtro de filial para o Gerente na UI, mas a query do backend deve sempre aplicar `WHERE user.branch_id = :branchIdDoJWT` para o Gerente, independentemente dos parâmetros recebidos. Omissão nessa lógica expõe dados de outras filiais.

4. **Dependência de `009-01.cadastrar-usuario` e `009-02.editar-usuario`.** A listagem é o hub de navegação — os botões "Novo Usuário" e "Editar" dependem das outras duas sub-features. A tela de listagem pode ser implementada independentemente, mas o fluxo completo só é testável quando as três sub-features estiverem disponíveis.

5. **Ausência de índice para busca por nome.** O `business.md` de `009-03` não menciona filtro por nome, apenas por filial, perfil e status. Os índices definidos em `009-00` cobrem essas queries. Se no futuro um filtro por nome for adicionado, um índice `idx_user_name` ou de texto completo será necessário.
