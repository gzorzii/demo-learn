# Cadastrar Livro — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `001-00.catalogo-livros`. Implementa o fluxo de criação de um novo registro de livro (novo ou usado) via formulário frontend na rota `/books/new` e o endpoint `POST /books` já especificado no `tech.md` de `001-00.catalogo-livros`.

Este documento **não redefine** o contrato de `POST /books` nem o schema das tabelas `book`, `book_stock`, `used_book_purchase_item` e `notification` — todos já especificados em `001-00.catalogo-livros/tech.md` e `000-01.modelagem-dados/tech.md`. O escopo aqui é detalhar o comportamento transacional, as regras de orquestração do serviço, o endpoint auxiliar de pré-preenchimento por ISBN (`GET /books/isbn-prefill`) e os requisitos da tela frontend.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Escrita em `book`, `book_stock`, `used_book_purchase_item`; leitura em `used_book_purchase`, `customer_wishlist`, `user`, `user_role`; escrita em `notification` |
| Serviço | Lógica transacional de criação; verificação de lote; disparo de notificações pós-commit |
| Frontend | Tela `/books/new`; chamada a `GET /books/isbn-prefill` no blur do campo ISBN |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas nem altera o schema**. Todas as tabelas utilizadas já existem no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Tabelas escritas por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `book` | `INSERT` | sempre |
| `book_stock` | `INSERT` | sempre; `quantity` = valor informado se `condition = 'new'`, fixado em `1` se `condition = 'used'` |
| `used_book_purchase_item` | `INSERT` | apenas quando `lot_id` é informado |
| `notification` | `INSERT` (N registros) | apenas quando há match em `customer_wishlist`, após commit da transação principal |

Tabelas lidas por este fluxo:

| Tabela | Propósito |
|--------|-----------|
| `book` | Busca por ISBN para pré-preenchimento (`registered_at DESC LIMIT 1`, sem filtro de filial) |
| `used_book_purchase` | Validação de existência e pertencimento à filial quando `lot_id` é informado |
| `customer_wishlist` | Detecção de match para geração de `book_arrival` após criação do livro |
| `user` + `user_role` + `role` | Localização dos usuários Gerente e Caixa da filial para destinação das notificações |

### Estratégia de migração

Nenhuma migration nova é necessária. O schema já existe. Rollback não aplicável a este módulo.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil Administrador, `branch_id` pode ser fornecido via query param `branch_id` para alternar o contexto de filial.

---

### `POST /books`

Contrato completo já especificado em `001-00.catalogo-livros/tech.md`. Esta seção detalha exclusivamente o **comportamento transacional e de orquestração** que o agente de implementação deve garantir.

#### Sequência de execução no serviço

A criação de um livro envolve duas fases obrigatórias separadas por limite de transação:

**Fase 1 — Transação principal (atômica)**

1. Validar campos de entrada conforme tabela de validações de `POST /books` em `001-00.catalogo-livros/tech.md`.
2. Se `lot_id` informado: executar `SELECT id FROM used_book_purchase WHERE id = :lotId AND branch_id = :branchId`. Se não encontrar → `404` antes de qualquer inserção.
3. Inserir registro em `book` com `registered_at = now()` definido pelo servidor (campo não aceito do cliente).
4. Inserir registro em `book_stock` com `book_id` recém-criado, `branch_id` da filial e `quantity` conforme regra: `1` fixo se `condition = 'used'`, valor do campo `quantity` se `condition = 'new'`.
5. Se `lot_id` informado: inserir registro em `used_book_purchase_item` com `purchase_id = lot_id` e `book_id` recém-criado.
6. Commit da transação.

**Fase 2 — Pós-commit (não transacional, falha silenciosa com log)**

7. Consultar `customer_wishlist` da filial por matches: `ILIKE '%:title%'` em `wishlist.title`, `ILIKE '%:author%'` em `wishlist.author`, ou `isbn = :isbn` (case-insensitive exato para ISBN). Cada linha da wishlist que bater gera notificações independentes.
8. Para cada match: buscar todos os usuários com perfil `Gerente` ou `Caixa` na filial via JOIN em `user_role` e `role`. Inserir um registro em `notification` por usuário com `type = 'book_arrival'`, `book_id` = ID do livro criado, `customer_wishlist_id` = ID do item da wishlist, `read = false`.
9. Falha nesta fase não reverte a criação do livro. O erro deve ser registrado em log (nível `ERROR`) com o ID do livro e o motivo.

> A separação das duas fases é necessária porque a notificação depende de um `book_id` que só existe após o commit. Executar as inserções em `notification` dentro da transação principal criaria um acoplamento desnecessário e tornaria o cadastro mais lento para catálogos com muitos itens na wishlist.

#### Invariantes que o serviço deve garantir

- `condition` aceita apenas `"new"` ou `"used"`. Qualquer outro valor → `400`.
- `condition_description` é obrigatório quando `condition = "used"`. Ausência → `400`.
- `quantity` é obrigatório e ≥ 1 quando `condition = "new"`. Ausência ou valor inválido → `400`.
- `quantity` enviado pelo cliente é ignorado quando `condition = "used"` — `book_stock.quantity` é sempre `1`.
- `lot_id` é aceito **somente** quando `condition = "used"`. Se enviado com `condition = "new"` → `400`.
- `registered_at` não é aceito no body — definido sempre como `now()` pelo servidor.
- `branch_id` não é aceito no body — sempre extraído do JWT (ou query param para Administrador).

---

### `GET /books/isbn-prefill`

Contrato completo já especificado em `001-00.catalogo-livros/tech.md` (seção `GET /books/{id}/isbn-prefill`).

> Atenção: a rota canônica definida em `001-00` é `GET /books/{id}/isbn-prefill` mas o `{id}` ali é um erro de nomenclatura — o ISBN é passado como query param `isbn`, não como path variable. A rota correta é `GET /books/isbn-prefill?isbn=:value`. O frontend deve chamar este endpoint no evento `onBlur` do campo ISBN ou quando o usuário acionar a busca explicitamente.

**Comportamento esperado no frontend:**

- Ao sair do campo ISBN (blur) ou acionar busca, o frontend chama `GET /books/isbn-prefill?isbn={valor}`.
- Se `200`: pré-preenche os campos `title`, `author`, `publisher`, `year` e `category` com os dados retornados, e exibe mensagem informativa "Campos pré-preenchidos com base no ISBN informado".
- Se `404`: não preenche nada, não exibe erro — o usuário preenche manualmente.
- Todos os campos pré-preenchidos permanecem editáveis.
- Um registro novo e independente é sempre criado ao salvar, independentemente do pré-preenchimento.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado: as operações de INSERT em `book`, `book_stock` e (quando aplicável) `used_book_purchase_item` são candidatas a virtual threads. A consulta pós-commit em `customer_wishlist` e as inserções em `notification` também são I/O-bound e devem ser executadas de forma não bloqueante.
- [ ] GraalVM AOT: nenhuma reflexão dinâmica introduzida por este fluxo. Os records de request/response (`BookCreateRequest`, `BookResponse`, `IsbnPrefillResponse`) já cobertos em `001-00.catalogo-livros/tech.md`.
- [ ] Dados sensíveis: nenhuma coluna sensível (CPF, CNPJ, senha, token) é lida ou escrita por este fluxo. O `branch_id` e `user_id` são UUIDs extraídos do JWT — não expostos diretamente nas respostas.
- [ ] Autorização por perfil: `Caixa` não tem acesso a `POST /books` (→ `403`); `Catalogador`, `Gerente` e `Administrador` têm acesso. `GET /books/isbn-prefill` também é restrito a `Catalogador`, `Gerente` e `Administrador` (→ `403` para `Caixa`).
- [ ] Isolamento por filial: a validação do `lot_id` deve verificar `used_book_purchase.branch_id = :branchId` do JWT — nunca confiar no `branch_id` vindo do cliente.
- [ ] A fase 2 (notificações) deve ser executada de forma assíncrona ou, no mínimo, após o retorno da resposta `201` ao cliente, para não aumentar a latência percebida.

## Estratégia de testes

### Fluxo principal (happy path)

- Criar livro `condition = "new"` com todos os campos obrigatórios; verificar resposta `201` com `registered_at` definido pelo servidor (não zero, não aceito do body) e `book_stock.quantity` igual ao `quantity` enviado.
- Criar livro `condition = "used"` sem `lot_id`; verificar `condition_description` persistido e `book_stock.quantity = 1`.
- Criar livro `condition = "used"` com `lot_id` válido da mesma filial; verificar inserção em `used_book_purchase_item` com `purchase_id = lot_id` e `book_id` correto.
- Chamar `GET /books/isbn-prefill?isbn=X` com ISBN existente; verificar campos `title`, `author`, `publisher`, `year` e `category` retornados do registro mais recente.
- Chamar `GET /books/isbn-prefill?isbn=X` com ISBN de registro em outra filial; verificar que retorna `200` (a busca não é restrita por filial).

### Casos de erro esperados

- `POST /books` com `condition = "used"` sem `condition_description` → `400`.
- `POST /books` com `condition = "new"` sem `quantity` → `400`.
- `POST /books` com `condition = "new"` e `quantity = 0` → `400`.
- `POST /books` com `sale_price = 0` ou negativo → `400`.
- `POST /books` com `condition = "invalid"` → `400`.
- `POST /books` com `lot_id` informado e `condition = "new"` → `400`.
- `POST /books` com `lot_id` de lote inexistente → `404`.
- `POST /books` com `lot_id` de lote de outra filial → `404`.
- `POST /books` com `isbn` em formato inválido (nem ISBN-10 nem ISBN-13) → `400`.
- `GET /books/isbn-prefill` sem parâmetro `isbn` → `400`.
- `GET /books/isbn-prefill` com ISBN não encontrado → `404`.

### Casos de autorização

- `Caixa` tentando `POST /books` → `403`.
- `Caixa` tentando `GET /books/isbn-prefill` → `403`.
- `Catalogador` acessando `POST /books` → `201` (com dados válidos).
- `Gerente` acessando `POST /books` → `201` (com dados válidos).
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Criar livro com ISBN e título que batem com itens em `customer_wishlist` da filial; verificar que notificações `book_arrival` são inseridas em `notification` para todos os Gerentes e Caixas da filial.
- Criar livro com autor que bate (case-insensitive, parcial) com item na wishlist; verificar notificação gerada.
- Falha na fase 2 (notificações) não deve reverter a criação do livro — o `201` deve ser retornado e o erro deve aparecer no log.
- Criar livro `condition = "used"` enviando `quantity = 5` no body; verificar que `book_stock.quantity = 1` (valor fixado pelo serviço, não o do cliente).
- Criar livro como Administrador com `branch_id` via query param; verificar que o livro é criado na filial informada, não na filial do JWT (que é `null` para Administrador).
- Busca de pré-preenchimento com ISBN presente em múltiplas filiais; verificar retorno dos dados do registro mais recente (`registered_at DESC LIMIT 1`).

## Riscos técnicos e dependências

1. **Dependência futura: feature `006-02.gerenciar-livros-lote`.** O campo `lot_id` aceito em `POST /books` pressupõe que lotes existam. A tabela `used_book_purchase` já está no schema (`000-01`), portanto a validação pode ser implementada sem aguardar a feature 006. Porém, se a interface de criação de lotes (006-xx) ainda não estiver disponível, o campo `lot_id` só será pré-preenchido quando o usuário vier de `006-02` — para testes do fluxo completo, um lote precisará ser inserido manualmente no banco ou via seed de testes.

2. **Dependência futura: feature `014-xx` (notificações de wishlist).** A inserção em `notification` após o cadastro do livro depende da tabela `customer_wishlist` existir com dados. A tabela já está no schema (`000-01`), então o código de consulta e inserção pode ser implementado agora. Sem dados na wishlist, a fase 2 termina sem inserções — comportamento correto, sem risco de falha.

3. **Fase 2 pós-commit e consistência de notificações.** A execução da verificação de wishlist e inserção de notificações fora da transação principal significa que falhas nessa fase (ex.: deadlock, timeout) resultam em notificações perdidas sem possibilidade de rollback. Logging com nível `ERROR` incluindo o `book_id` é obrigatório para permitir reprocessamento manual se necessário. Uma fila de retry não é requisito nesta iteração.

4. **Perfil Administrador sem `branch_id` no JWT.** O claim `branchId` é `null` para o Administrador. O serviço deve exigir o query param `branch_id` explícito quando o perfil for Administrador; ausência desse parâmetro deve retornar `400` ("filial obrigatória para Administrador"). Caso contrário, a tentativa de inserir `book.branch_id = null` violará o `NOT NULL` constraint e causará erro `500` em vez do `400` esperado.

5. **Validação de formato ISBN.** O `business.md` exige formato ISBN-10 ou ISBN-13, mas não especifica se hifens são aceitos. A implementação deve normalizar o valor (remover hifens e espaços) antes da validação e persistência, para evitar inconsistências na busca de pré-preenchimento por ISBN.
