# Notificações — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz de infraestrutura de notificações in-app. Define o schema da tabela `notification` (já existente em `000-01.modelagem-dados`), os tipos de notificação, os produtores responsáveis pela geração e as regras de deduplicação.

Este módulo **não expõe endpoints próprios** e **não tem interface de usuário**. É o documento normativo consumido pelos dois produtores de notificações:

| Produtor | Feature | Evento que dispara |
|----------|---------|-------------------|
| Cadastro de livro | `001-01.cadastrar-livro` | Livro correspondente a item em `customer_wishlist` |
| Job agendado | este módulo | Livro ultrapassa `shelf_threshold.days_threshold` |

A leitura e interação com notificações são responsabilidade de `014-01.central-notificacoes`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura e escrita em `notification`; leitura em `book`, `book_stock`, `shelf_threshold`, `"user"`, `user_role`, `role`, `branch`, `customer_wishlist` |
| Serviço | Job agendado (`@Scheduled`) de verificação de vencimento de prateleira |
| Frontend | Nenhum — módulo raiz sem tela própria |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas**. A tabela `notification` já existe no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### `notification` — referência normativa

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `user_id` | `UUID` | NOT NULL | — | FK → `"user"(id)` |
| `type` | `TEXT` | NOT NULL | — | valores: `'book_arrival'` \| `'shelf_overdue'` |
| `message` | `TEXT` | NOT NULL | — | texto descritivo gerado pelo produtor |
| `book_id` | `UUID` | NULL | — | FK → `book(id)` |
| `customer_wishlist_id` | `UUID` | NULL | — | FK → `customer_wishlist(id)` |
| `read` | `BOOLEAN` | NOT NULL | `false` | marcado como `true` pelo consumidor |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

> O schema em `000-01.modelagem-dados/tech.md` define `user_id` como NOT NULL com FK para `"user"`. O campo `customer_id` mencionado no `business.md` de `014-00` **não existe** no schema — o destinatário é sempre um `user_id`. Notificações são internas ao sistema; clientes não são destinatários.

O índice `idx_notification_user ON notification(user_id, read)` definido em `000-01.modelagem-dados/tech.md` cobre a query principal de `014-01` (`WHERE user_id = ? AND read = false`).

### Regras de geração por tipo

#### `book_arrival`

Gerado por `001-01.cadastrar-livro` na Fase 2 (pós-commit). Regras já especificadas em `001-01.cadastrar-livro/tech.md`:

- Destinatários: todos os usuários com perfil `Gerente` ou `Caixa` da filial onde o livro foi cadastrado.
- `book_id` = UUID do livro criado.
- `customer_wishlist_id` = UUID do item da wishlist que gerou o match.
- `message` = texto descritivo no formato: `"O livro '<título>' está disponível. Cliente desejante: <nome do cliente>"` (implementação pode ajustar o texto).
- Após gerar as notificações, marcar `customer_wishlist.notified = true` para o item correspondente (evita re-notificação se o mesmo título for cadastrado novamente).

#### `shelf_overdue`

Gerado pelo job agendado definido neste módulo. Regras:

- Destinatários: todos os usuários com perfil `Gerente` da filial onde o livro está.
- `book_id` = UUID do livro vencido.
- `customer_wishlist_id` = NULL (não aplicável).
- `message` = texto descritivo no formato: `"O livro '<título>' está há <N> dias na prateleira (limite: <days_threshold> dias)"`.
- **Deduplicação:** não gerar nova notificação `shelf_overdue` se já existir registro em `notification` com `type = 'shelf_overdue'`, `book_id = :bookId`, `user_id = :userId` e `read = false`. Uma nova notificação só é gerada quando a anterior tiver `read = true` (foi lida ou dispensada).

Consulta de deduplicação antes de cada INSERT:

```sql
SELECT COUNT(*) FROM notification
WHERE type = 'shelf_overdue'
  AND book_id = :bookId
  AND user_id = :userId
  AND read = false;
-- Se COUNT > 0: não inserir
```

### Job agendado — especificação

O job verifica livros vencidos para **todas as filiais** com `shelf_threshold` configurado e gera notificações para os Gerentes correspondentes.

- **Anotação:** `@Scheduled` (Spring Scheduling) ou `@Scheduled(cron = "...")` com cron configurável via `application.properties`.
- **Propriedade de configuração:** `app.notifications.shelf-overdue-cron` (valor padrão: `"0 0 8 * * *"` — todos os dias às 8h).
- **Execução:** o job deve ser idempotente. Se executado múltiplas vezes no mesmo dia, a regra de deduplicação evita notificações duplicadas.
- **Transação:** cada par `(book_id, user_id)` que resultar em INSERT deve ser executado em transação independente para evitar rollback em cascata por falha em um único item.
- **Falha silenciosa com log:** falha ao gerar notificação para um livro específico não deve interromper o processamento dos demais. O erro deve ser registrado em log nível `ERROR` com `book_id`, `user_id` e mensagem de erro.

Sequência de execução do job:

1. Consultar todos os livros vencidos usando o predicado canônico de `012-00.tempo-prateleira/tech.md`.
2. Para cada livro vencido: buscar todos os usuários com perfil `Gerente` da filial do livro (via JOIN em `user_role` → `role` WHERE `role.name = 'Gerente'` e `user.active = true` e `user.branch_id = book.branch_id`).
3. Para cada par `(book_id, user_id)`: verificar deduplicação. Se não existir notificação não lida → INSERT em `notification`.
4. Após processamento de todos os livros: log de sumário com quantidade de notificações geradas e quantidade de duplicatas evitadas.

### Estratégia de migração

Nenhuma migration nova de schema é necessária. O job é configuração de código, não de banco.

## Contratos de API

Este módulo **não expõe endpoints**. Os contratos de API estão em `014-01.central-notificacoes/tech.md`.

## Requisitos de qualidade

- [ ] I/O-bound identificado? O job agendado realiza múltiplas queries e INSERTs no banco — todo I/O-bound. A implementação deve usar virtual threads para não bloquear a thread do scheduler durante o processamento em lote.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? `@Scheduled` é suportado pelo Spring AOT. Atenção a `cron` expressions carregadas de `application.properties` — compatível com AOT via `@Value`.
- [ ] Dados sensíveis tratados adequadamente? O campo `message` pode conter título de livro e nome de cliente (para `book_arrival`). Não é dado pessoal sensível no contexto de sistema interno. Nenhum CPF, CNPJ, senha ou token é armazenado em `notification`.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? Não aplicável — este módulo não expõe endpoints. O job é executado pelo sistema, não por usuários.

## Estratégia de testes

### Fluxo principal (happy path)

- Job executa com livro há 31 dias em filial com `days_threshold = 30`, Gerente ativo na filial, sem notificação prévia não lida → INSERT em `notification` com `type = 'shelf_overdue'`, `book_id` correto, `user_id` = UUID do Gerente.
- Job executa novamente → nenhuma notificação adicional criada (deduplicação funciona).
- Gerente lê a notificação (`read = true`) → job executa → nova notificação gerada (deduplicação permite após leitura).

### Casos de erro esperados

- Falha no INSERT para um par `(book_id, user_id)` → erro logado em nível `ERROR`; demais notificações do lote são geradas normalmente.
- Filial sem `shelf_threshold` configurado → nenhuma notificação gerada para a filial; sem erro.

### Casos de borda das regras de negócio

- Livro com exatamente `days_threshold` dias → não gera notificação (`>` estrito).
- Livro com `active = false` → não gera notificação.
- Livro com `quantity = 0` → não gera notificação.
- Filial com 2 Gerentes ativos → 2 notificações geradas para o mesmo livro (uma por destinatário).
- Item `customer_wishlist` com `notified = true` → cadastro de novo livro com mesmo título **não** gera nova notificação `book_arrival` para aquele item (deduplicação via `notified`).

## Riscos técnicos e dependências

1. **Execução do job em ambiente multi-instância.** Se o sistema for executado em mais de uma instância (ex.: futuro deploy horizontal), o job `@Scheduled` dispara em cada instância simultaneamente. A regra de deduplicação por `(book_id, user_id, read = false)` protege contra duplicatas lógicas, mas pode ocorrer race condition entre duas instâncias verificando e inserindo ao mesmo tempo. Para esta iteração (monolito single-instance), o risco não existe. Se multi-instância for necessário, adicionar lock distribuído ou migrar para `ShedLock`.

2. **Volume alto de livros vencidos.** Se centenas de livros estiverem vencidos em múltiplas filiais, o job pode demorar e gerar muitos INSERTs. A execução em lote deve usar transações independentes por item (não uma transação global) para evitar locks prolongados. Monitorar tempo de execução em produção.

3. **Dependência de `001-01.cadastrar-livro` para `book_arrival`.** A lógica de geração de `book_arrival` está implementada em `001-01`, não aqui. Este módulo é apenas o contrato normativo. Qualquer inconsistência na implementação de `001-01` afeta a geração de `book_arrival` sem visibilidade neste módulo.

4. **Horário do job como configuração de infraestrutura.** O cron default `"0 0 8 * * *"` é uma sugestão operacional — deve ser ajustável via `application-dev.properties` para facilitar testes locais (ex.: `"*/1 * * * * *"` para execução a cada segundo em dev).
