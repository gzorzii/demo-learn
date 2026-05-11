# Central de Notificações — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `014-00.notificacoes`. Implementa a interface de leitura e interação com notificações in-app: ícone de sino no header, painel sobreposto de notificações não lidas, marcação como lida, dispensa e marcação em massa.

Este módulo é **exclusivamente de leitura e marcação** — zero INSERTs em `notification`. Toda geração de registros é responsabilidade dos produtores definidos em `014-00.notificacoes/tech.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura e UPDATE em `notification` (somente campo `read`) |
| API | `GET /notifications`, `PATCH /notifications/{id}/read`, `DELETE /notifications/{id}`, `PATCH /notifications/read-all` |
| Frontend | Componente `NotificationBadge` no `TopBar` (todas as rotas autenticadas); painel sobreposto sem rota própria |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. A tabela `notification` já existe no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

O índice `idx_notification_user ON notification(user_id, read)` definido em `000-01.modelagem-dados/tech.md` cobre a query principal `WHERE user_id = ? AND read = false ORDER BY created_at DESC` com eficiência.

### Estratégia de migração

Nenhuma migration nova é necessária. Rollback não aplicável.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `user_id` de escopo é extraído do claim `sub` do JWT — nunca do body ou de query params. Um usuário nunca pode ler, marcar ou dispensar notificações de outro usuário.

---

### `GET /notifications`

Retorna todas as notificações não lidas (`read = false`) do usuário autenticado, ordenadas da mais recente para a mais antiga.

- **Authorization:** `Gerente`, `Caixa`, `Administrador`
- **Query params:** nenhum
- **Response `200`:**

  ```json
  {
    "unread_count": 0,
    "notifications": [
      {
        "id": "uuid",
        "type": "book_arrival|shelf_overdue",
        "message": "string",
        "book_id": "uuid|null",
        "customer_wishlist_id": "uuid|null",
        "created_at": "ISO-8601"
      }
    ]
  }
  ```

  > `unread_count` é o total de notificações não lidas — pode ser maior que `notifications.length` se paginação for aplicada no futuro. Nesta iteração, retorna todas sem paginação; `unread_count == notifications.length`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada; pode ser `notifications: []` com `unread_count: 0` |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Sem notificações não lidas → `200` com `notifications: []`, `unread_count: 0`.
  - Catalogador → `403` (não possui acesso ao sino conforme `modulePermissions.ts`).

---

### `PATCH /notifications/{id}/read`

Marca uma notificação individual como lida (`read = true`).

> O dismiss do `business.md` produz o mesmo efeito técnico que "marcar como lida" — ambos setam `read = true`. São operações semanticamente distintas na UX (dismiss = fechar sem intenção de revisitar; read = confirmação de leitura), mas tecnicamente idênticas. O endpoint único `PATCH /notifications/{id}/read` serve ambos os casos; o frontend diferencia apenas no rótulo do botão.

- **Authorization:** `Gerente`, `Caixa`, `Administrador`
- **Path param:** `id` — UUID da notificação
- **Request body:** nenhum
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Notificação marcada como lida com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Notificação pertence a outro usuário; ou perfil `Catalogador` |
  | `404` | UUID não encontrado em `notification` |
  | `409` | Notificação já estava com `read = true` — operação idempotente, retornar `204` igualmente |
  | `500` | Erro inesperado |

  > Recomenda-se tratar como idempotente: se `read` já for `true`, retornar `204` sem erro (não `409`). A tabela acima lista `409` para referência, mas o comportamento preferido é idempotência silenciosa.

- **Edge cases:**
  - Verificar `notification.user_id = sub do JWT` antes de atualizar → `403` se não corresponder.
  - Notificação com `read = true` já → `204` idempotente.

---

### `DELETE /notifications/{id}`

Dispensa (dismiss) uma notificação — comportamento técnico idêntico ao PATCH acima: seta `read = true`. O endpoint `DELETE` existe para semântica RESTful de "remover do painel", mas não exclui o registro — apenas o oculta via `read = true`.

> A decisão de usar `DELETE` em vez de um segundo `PATCH` é de semântica de API: o usuário "remove" a notificação do painel. Fisicamente, o registro permanece no banco com `read = true`. Não há exclusão física de registros neste módulo.

- **Authorization:** `Gerente`, `Caixa`, `Administrador`
- **Path param:** `id` — UUID da notificação
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Notificação dispensada com sucesso (ou já estava com `read = true`) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Notificação pertence a outro usuário; ou perfil `Catalogador` |
  | `404` | UUID não encontrado |
  | `500` | Erro inesperado |

---

### `PATCH /notifications/read-all`

Marca todas as notificações não lidas (`read = false`) do usuário autenticado como lidas (`read = true`).

> Esta rota deve ser registrada **antes** de `PATCH /notifications/{id}/read` no controller para evitar que `read-all` seja interpretado como um UUID path variable.

- **Authorization:** `Gerente`, `Caixa`, `Administrador`
- **Request body:** nenhum
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Todas as notificações marcadas como lidas (ou não havia nenhuma — idempotente) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Sem notificações não lidas → `204` idempotente, sem erro.
  - O UPDATE deve ser restrito a `user_id = sub do JWT` e `read = false` — nunca afetar notificações de outros usuários.
  - SQL esperado: `UPDATE notification SET read = true WHERE user_id = :userId AND read = false`.

## DTOs de domínio

```
NotificationResponse       — item individual dentro de "notifications"
NotificationListResponse   — resposta de GET /notifications; inclui "unread_count" e "notifications"
```

## Mecanismo de atualização do badge (frontend)

O badge do sino exibe `unread_count` e deve ser atualizado sem recarregar a página. Três abordagens possíveis — a decisão é deixada para a implementação:

| Abordagem | Prós | Contras |
|-----------|------|---------|
| Polling `GET /notifications` a cada 30s | Simples; sem infraestrutura adicional | Latência de até 30s; requisições constantes |
| SSE (Server-Sent Events) | Atualização em tempo real; conexão leve | Requer suporte a SSE no Spring Boot (disponível via `SseEmitter`) |
| WebSocket | Bidirecional; menor latência | Overhead maior para uso unidirecional |

> Para a iteração atual, **polling simples** (30s) é recomendado. SSE pode ser implementado em iteração futura sem alterar os contratos de API existentes.

O hook `useNotifications` no frontend deve:

1. Chamar `GET /notifications` na montagem do componente `TopBar`.
2. Armazenar `unread_count` e a lista em estado local (ou store global).
3. Re-chamar periodicamente (polling) ou via SSE.
4. Após `PATCH /notifications/{id}/read`, `DELETE /notifications/{id}` ou `PATCH /notifications/read-all` com sucesso → atualizar estado local imediatamente (otimistic update) sem aguardar o próximo polling.

## Requisitos de qualidade

- [ ] I/O-bound identificado? `GET /notifications` e os UPDATEs são I/O-bound — candidatos a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java para DTOs são compatíveis. `SseEmitter` (se SSE for escolhido) requer verificação de compatibilidade AOT.
- [ ] Dados sensíveis tratados adequadamente? O campo `message` pode conter título de livro e nome de cliente — dado operacional interno, não sensível. Nenhum CPF, CNPJ, senha ou token é exposto.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `Catalogador` recebe `403` em todos os endpoints. Todos os endpoints verificam `notification.user_id = sub do JWT` antes de operar — nunca acesso cross-user.

## Estratégia de testes

### Fluxo principal (happy path)

- Gerente com 3 notificações não lidas → `GET /notifications` retorna `unread_count: 3` e lista com 3 itens, ordenados por `created_at DESC`.
- `PATCH /notifications/{id}/read` → `204`; re-chamar `GET /notifications` retorna `unread_count: 2`.
- `DELETE /notifications/{id}` → `204`; notificação não aparece mais na lista.
- `PATCH /notifications/read-all` com 2 notificações restantes → `204`; `GET /notifications` retorna `unread_count: 0` e `notifications: []`.
- Usuário sem notificações não lidas → `GET /notifications` retorna `200` com `unread_count: 0`.

### Casos de erro esperados

- `PATCH /notifications/{id}/read` com UUID inexistente → `404`.
- `DELETE /notifications/{id}` com UUID inexistente → `404`.
- `PATCH /notifications/read-all` sem notificações não lidas → `204` idempotente.
- `PATCH /notifications/{id}/read` já com `read = true` → `204` idempotente.

### Casos de autorização

- Perfil `Catalogador` em `GET /notifications` → `403`.
- Perfil `Catalogador` em `PATCH /notifications/{id}/read` → `403`.
- Usuário A tentando `PATCH /notifications/{id}/read` com notificação do usuário B → `403` (verificação de `user_id`).
- Usuário A tentando `DELETE /notifications/{id}` com notificação do usuário B → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Gerente com notificações `book_arrival` e `shelf_overdue` → ambas aparecem em `GET /notifications`.
- Caixa → apenas notificações `book_arrival` aparecem (pois `shelf_overdue` nunca é gerado para Caixa, conforme `014-00`).
- Administrador sem filial configurada (global) → recebe apenas `shelf_overdue` se estiver operando no contexto de filial (conforme `014-00`); na prática, `GET /notifications` retorna o que existir com `user_id` do JWT.
- `PATCH /notifications/read-all` deve usar `WHERE user_id = :userId AND read = false` — verificar que não afeta notificações de outros usuários em teste com múltiplos usuários no banco.

## Riscos técnicos e dependências

1. **Rota `PATCH /notifications/read-all` conflita com `PATCH /notifications/{id}/read`.** A rota `read-all` deve ser registrada antes de `{id}/read` no controller para que `read-all` não seja interpretado como UUID. Spring MVC prioriza rotas literais sobre path variables — verificar comportamento com Spring Boot 4 (mesmo risco documentado para `/books/search` em `001-00.catalogo-livros/tech.md`).

2. **Polling vs. SSE — decisão de implementação.** O `business.md` define que "a frequência e o mecanismo de atualização são decisão de implementação técnica". Polling simples é recomendado para a iteração atual. Se SSE for escolhido, o `SseEmitter` do Spring mantém conexões HTTP abertas — deve-se limitar o número de conexões simultâneas e tratar timeouts de forma adequada.

3. **Ausência de paginação em `GET /notifications`.** Para usuários com muitas notificações não lidas acumuladas (ex.: gerente que não abre o sistema por semanas), a resposta pode ser grande. O volume esperado é baixo (dezenas no máximo por usuário), mas se o job `shelf_overdue` gerar notificações diariamente sem leitura, pode acumular. Monitorar em produção; adicionar paginação se necessário.

4. **Isolamento cross-user é crítico.** Os endpoints `PATCH` e `DELETE` operam sobre UUIDs diretos. Um bug na verificação de `user_id` permitiria que um usuário marcasse notificações de outro como lidas. A verificação `notification.user_id = sub do JWT` deve ocorrer **antes** de qualquer UPDATE — não como validação após o fato.

5. **Dependência de `014-00.notificacoes` para dados.** Se o job agendado e o produtor de `book_arrival` não estiverem implementados, `GET /notifications` retorna sempre vazio — comportamento correto, sem falha. A feature pode ser implementada e testada de forma independente inserindo registros manualmente no banco de testes.
