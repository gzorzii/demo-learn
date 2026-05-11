# Editar Livro — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `001-00.catalogo-livros`. Implementa o fluxo de atualização de um livro existente via formulário frontend na rota `/books/:id/edit` e o endpoint `PUT /books/{id}` já especificado em `001-00.catalogo-livros/tech.md`.

Este documento **não redefine** o contrato de `PUT /books/{id}` nem o schema das tabelas `book`, `book_stock` e `price_history` — todos já especificados em `001-00.catalogo-livros/tech.md` e `000-01.modelagem-dados/tech.md`. O escopo aqui é detalhar:

- O comportamento transacional da edição, incluindo a obrigatoriedade do registro em `price_history` antes do `UPDATE` em `book.sale_price`.
- As regras de imutabilidade de campos (`condition`, `registered_at`, `lot_id`, `branch_id`).
- O ajuste de estoque para livros novos.
- Os requisitos da tela frontend, com pré-preenchimento do formulário a partir dos dados atuais do livro.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura em `book`, `book_stock`; escrita em `book` e `book_stock`; escrita condicional em `price_history` |
| Serviço | Lógica transacional; comparação de preço; geração de `price_history`; ajuste de `book_stock` |
| Frontend | Tela `/books/:id/edit`; carregamento de dados via `GET /books/{id}`; submissão via `PUT /books/{id}` |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas nem altera o schema**. Todas as tabelas utilizadas já existem no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Tabelas lidas e escritas por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `book` | `SELECT` | carregamento dos dados atuais para exibição no formulário e para comparação de preço |
| `book` | `UPDATE` | sempre, ao salvar a edição; atualiza `updated_at = now()` |
| `book_stock` | `UPDATE` | apenas quando `condition = 'new'` e `quantity` for informado |
| `price_history` | `INSERT` | apenas quando `sale_price` no body difere do `sale_price` atual do livro |

### Campos imutáveis

Os campos abaixo **não devem ser aceitos** no body de `PUT /books/{id}`. Se recebidos, devem ser rejeitados com `400` para sinalizar ao cliente que a operação não é permitida:

| Campo | Tabela | Motivo da imutabilidade |
|-------|--------|------------------------|
| `condition` | `book` | condição do livro (novo/usado) não pode mudar após cadastro |
| `registered_at` | `book` | data de cadastro é definida pelo servidor na criação e não pode ser alterada |
| `lot_id` | vínculo via `used_book_purchase_item` | o vínculo com o lote de compra de usados é definitivo após a criação |
| `branch_id` | `book` | isolamento por filial é gerenciado via JWT, não pelo cliente |

> O campo `lot_id` não existe como coluna em `book` — o vínculo é feito por `used_book_purchase_item.book_id`. A rejeição de `lot_id` no body da edição é uma regra de negócio: o cliente não deve enviar este campo e, se enviado, deve receber `400`.

### Estratégia de migração

Nenhuma migration nova é necessária. O schema já existe. Rollback não aplicável a este módulo.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil Administrador, `branch_id` pode ser fornecido via query param para alternar o contexto de filial.

---

### `GET /books/{id}`

Contrato completo já especificado em `001-00.catalogo-livros/tech.md`. Consumido pelo frontend desta feature para pré-preencher o formulário de edição com os dados atuais do livro.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Uso nesta feature:** o frontend chama este endpoint ao montar a tela `/books/:id/edit`. Os dados retornados populam os campos editáveis do formulário. Campos imutáveis (`condition`, `registered_at`) são exibidos apenas como leitura, sem controle de edição.
- **Status codes relevantes para a tela:**

  | Código | Comportamento no frontend |
  |--------|--------------------------|
  | `200` | formulário pré-preenchido com dados do livro |
  | `401` | `PrivateRoute` redireciona para `/login` |
  | `403` | livro pertence a outra filial; exibe mensagem de permissão negada |
  | `404` | livro não encontrado; exibe mensagem e redireciona para `/books` |
  | `500` | exibe mensagem genérica de erro |

---

### `PUT /books/{id}`

Contrato completo já especificado em `001-00.catalogo-livros/tech.md`. Esta seção detalha exclusivamente o **comportamento transacional e de orquestração** que o agente de implementação deve garantir.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Path param:** `id` — UUID do livro

#### Request body

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `title` | `string` | sim | não vazio; máx. 500 caracteres |
| `author` | `string` | sim | não vazio; máx. 300 caracteres |
| `isbn` | `string` | sim | não vazio; formato ISBN-10 ou ISBN-13 (hifens normalizados antes da validação) |
| `publisher` | `string` | não | máx. 300 caracteres |
| `year` | `integer` | não | entre 1 e ano corrente |
| `category` | `string` | sim | não vazio; máx. 150 caracteres |
| `condition_description` | `string` | condicional | obrigatório quando livro tem `condition = 'used'`; máx. 1000 caracteres |
| `sale_price` | `number` | sim | > 0; máx. 2 casas decimais |
| `quantity` | `integer` | condicional | obrigatório quando livro tem `condition = 'new'`; deve ser ≥ 0 |
| `shelf_location` | `string` | não | máx. 100 caracteres |
| `description` | `string` | não | máx. 2000 caracteres |

> Campos imutáveis (`condition`, `registered_at`, `lot_id`, `branch_id`) devem ser rejeitados com `400` caso presentes no body.

#### Sequência de execução no serviço

A edição é executada em uma única transação atômica:

**Transação única (atômica)**

1. Validar campos de entrada conforme tabela acima.
2. Verificar a existência do livro: `SELECT * FROM book WHERE id = :id`. Se não encontrado → `404`.
3. Verificar que `book.branch_id` corresponde ao `branchId` do JWT (ou ao `branch_id` query param para Administrador). Se não corresponder → `403`.
4. Verificar campos imutáveis no body: se `condition`, `registered_at`, `lot_id` ou `branch_id` estiverem presentes → `400`.
5. Se `book.condition = 'used'` e `condition_description` não informado → `400`.
6. Se `book.condition = 'new'` e `quantity` não informado → `400`.
7. **Comparação de preço:** se `sale_price` no body for diferente do `book.sale_price` atual:
   a. Inserir registro em `price_history` com `book_id`, `previous_price = book.sale_price atual`, `new_price = sale_price do body`, `changed_by = sub do JWT`, `changed_at = now()`.
   b. O INSERT em `price_history` deve preceder o UPDATE em `book` na mesma transação — se o UPDATE falhar, o INSERT é revertido junto.
8. Executar `UPDATE book SET title=?, author=?, isbn=?, publisher=?, year=?, category=?, condition_description=?, sale_price=?, shelf_location=?, description=?, updated_at=now() WHERE id=?`.
9. Se `book.condition = 'new'`: executar `UPDATE book_stock SET quantity=?, updated_at=now() WHERE book_id=? AND branch_id=?`.
10. Commit da transação.
11. Retornar `200` com o mesmo formato de `GET /books/{id}` (dados atualizados, incluindo `images` e `stock_quantity`).

> A razão para inserir em `price_history` **antes** do `UPDATE` em `book` é garantir atomicidade: se o `UPDATE` falhar por qualquer motivo (constraint, timeout, deadlock), o registro de `price_history` é revertido junto — nunca fica um histórico órfão de uma atualização que não aconteceu.

#### Invariantes que o serviço deve garantir

- O campo `condition` do livro nunca é alterado por este endpoint — o valor persistido na criação é definitivo.
- O registro em `price_history` só é criado quando `sale_price` muda — alterações em qualquer outro campo não geram histórico.
- Para livros usados, `book_stock.quantity` permanece `1` e **não é atualizado** por este endpoint — `quantity` no body é ignorado para livros usados (ou rejeitado com `400` se informado para livros usados, conforme decisão de implementação).
- O campo `lot_id` não existe como campo editável — a rejeição é responsabilidade da validação do DTO de entrada.
- O `branch_id` do livro nunca é alterado — o isolamento de filial é verificado mas não modificado.

#### Response `200`

Mesmo formato de `GET /books/{id}`, conforme especificado em `001-00.catalogo-livros/tech.md`:

```json
{
  "id": "uuid",
  "title": "string",
  "author": "string",
  "isbn": "string|null",
  "publisher": "string|null",
  "year": 0,
  "category": "string",
  "condition": "new|used",
  "condition_description": "string|null",
  "sale_price": 0.00,
  "description": "string|null",
  "shelf_location": "string|null",
  "branch_id": "uuid",
  "registered_at": "ISO-8601",
  "active": true,
  "stock_quantity": 0,
  "images": [
    {
      "id": "uuid",
      "url": "string",
      "order": 0
    }
  ]
}
```

#### Status codes

| Código | Quando ocorre |
|--------|--------------|
| `200` | Livro atualizado com sucesso |
| `400` | Falha de validação: campo inválido, `condition_description` ausente para livro usado, `sale_price` ≤ 0, campo imutável presente no body (`condition`, `registered_at`, `lot_id`, `branch_id`) |
| `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
| `403` | Livro pertence a outra filial; ou perfil `Caixa` |
| `404` | UUID não encontrado |
| `409` | Não aplicável |
| `500` | Erro inesperado |

#### Edge cases

- Se `sale_price` enviado for numericamente igual ao `sale_price` atual (ex.: ambos `25.00`), nenhum registro é criado em `price_history`. A comparação deve ser feita considerando precisão numérica — não comparar strings.
- Se `quantity = 0` for enviado para livro `condition = 'new'`, o serviço deve aceitar (redução de estoque a zero é operacionalmente válida) e atualizar `book_stock.quantity = 0`.
- Perfil Administrador com `branchId = null` no JWT deve exigir `branch_id` como query param; ausência → `400` ("filial obrigatória para Administrador").
- Se `isbn` é normalizado (hifens removidos) antes da validação e persistência, o valor armazenado em `book.isbn` deve ser o valor normalizado, não o valor original do body.

---

## DTOs de domínio

Esta feature reutiliza os DTOs já definidos em `001-00.catalogo-livros/tech.md`:

| DTO | Uso nesta feature |
|-----|-----------------|
| `BookUpdateRequest` | body de `PUT /books/{id}` |
| `BookResponse` | resposta de `PUT /books/{id}` e `GET /books/{id}` (para pré-preenchimento) |

Nenhum DTO novo é introduzido por esta sub-feature.

## Requisitos de qualidade

- [ ] I/O-bound identificado? Chamadas a PostgreSQL (`SELECT`, `UPDATE` em `book`, `UPDATE` em `book_stock`, `INSERT` em `price_history`) são I/O-bound — candidatas a virtual threads (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] GraalVM AOT: nenhuma reflexão dinâmica introduzida por este fluxo. Os records de request/response (`BookUpdateRequest`, `BookResponse`) já cobertos em `001-00.catalogo-livros/tech.md`.
- [ ] Dados sensíveis tratados adequadamente? O campo `changed_by` em `price_history` armazena UUID de usuário — não é exposto nas respostas deste endpoint. Nenhuma coluna sensível (CPF, CNPJ, senha, token) é lida ou escrita.
- [ ] Autorização por perfil coberta em todos os endpoints? `Caixa` não tem acesso a `PUT /books/{id}` (→ `403`). `GET /books/{id}` para pré-preenchimento do formulário está restrito a `Administrador`, `Gerente` e `Catalogador` nesta tela (embora o endpoint em si aceite `Caixa`, o formulário de edição não é acessível ao perfil `Caixa`).
- [ ] Isolamento por filial verificado no backend para todos os endpoints — `branch_id` extraído do JWT, nunca do body.
- [ ] Atomicidade da transação de edição: o `INSERT` em `price_history` e o `UPDATE` em `book` devem ocorrer na mesma transação; falha em qualquer operação reverte todas.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `/books/:id/edit` com livro da própria filial; verificar que o formulário exibe os dados atuais do livro em todos os campos editáveis.
- Editar apenas o campo `shelf_location` (sem alterar `sale_price`) e salvar; verificar `200`, `book.shelf_location` atualizado, nenhuma entrada criada em `price_history`.
- Editar `sale_price` de R$30,00 para R$25,00 e salvar; verificar `200`, `book.sale_price = 25.00`, uma entrada criada em `price_history` com `previous_price = 30.00`, `new_price = 25.00`, `changed_by` igual ao UUID do usuário autenticado e `changed_at` próximo ao momento da chamada.
- Editar múltiplos campos incluindo `sale_price` em uma única requisição; verificar que apenas um registro é criado em `price_history` (não um por campo alterado).
- Editar `quantity` de livro `condition = 'new'`; verificar que `book_stock.quantity` é atualizado.
- Editar `condition_description` de livro `condition = 'used'`; verificar persistência correta.
- Após salvar com sucesso, verificar redirecionamento para `/books/:id` (visualização do livro editado).
- Acionar "Cancelar" no formulário; verificar redirecionamento para `/books/:id` sem alterações salvas.

### Casos de erro esperados

- `PUT /books/{id}` com `condition_description` vazio/ausente para livro `used` → `400`.
- `PUT /books/{id}` com `sale_price = 0` → `400`.
- `PUT /books/{id}` com `sale_price` negativo → `400`.
- `PUT /books/{id}` com `title` vazio → `400`.
- `PUT /books/{id}` com `isbn` em formato inválido → `400`.
- `PUT /books/{id}` com `condition` presente no body → `400`.
- `PUT /books/{id}` com `registered_at` presente no body → `400`.
- `PUT /books/{id}` com `lot_id` presente no body → `400`.
- `PUT /books/{id}` com `branch_id` presente no body → `400`.
- `PUT /books/{id}` com UUID inexistente → `404`.
- Formulário com erros de validação: verificar que a tela permanece em `/books/:id/edit` com mensagens de erro por campo.

### Casos de autorização

- Perfil `Caixa` tentando `PUT /books/{id}` → `403`.
- Perfil `Caixa` tentando acessar a rota `/books/:id/edit` → redirecionado pelo `RoleRoute` no frontend.
- Usuário da filial A tentando editar livro da filial B → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.
- `Catalogador` editando livro da própria filial → `200`.
- `Gerente` editando livro da própria filial com alteração de preço → `200` + registro em `price_history`.
- Administrador editando livro com `branch_id` via query param → `200` (livro criado na filial informada).

### Casos de borda das regras de negócio

- Enviar `sale_price` igual ao valor atual (sem mudança numérica): verificar que nenhum registro é criado em `price_history`.
- Simular falha no `UPDATE` em `book` após o `INSERT` em `price_history` (teste de rollback): verificar que `price_history` não contém o registro inserido (atomicidade transacional).
- Editar livro `condition = 'used'` enviando `quantity` no body: verificar rejeição com `400` ou que `book_stock.quantity` permanece `1` (conforme decisão de implementação documentada).
- Editar livro `condition = 'new'` com `quantity = 0`: verificar que `book_stock.quantity = 0` (redução a zero é válida).
- Administrador sem `branch_id` no JWT e sem query param `branch_id`: verificar `400` com mensagem "filial obrigatória para Administrador".

## Riscos técnicos e dependências

1. **Atomicidade do par `price_history` + `book.sale_price`.** A regra de negócio exige que o `INSERT` em `price_history` preceda o `UPDATE` em `book`, ambos na mesma transação. Implementações que usam `@PreUpdate` JPA devem garantir que o hook é executado antes do flush da entidade `Book`. Se a ordem não for garantida explicitamente no serviço, pode ocorrer situação de `price_history` refletindo um preço que o `UPDATE` em `book` ainda não confirmou. Recomenda-se lógica explícita no serviço em vez de confiar no ciclo de vida JPA para este caso específico.

2. **Comparação de valores `NUMERIC(10,2)` em Java.** O campo `sale_price` é `NUMERIC(10,2)` no banco e `BigDecimal` em Java. A comparação entre o valor atual e o novo deve usar `compareTo`, não `equals`, para evitar falso positivo por diferença de escala (`25.00` vs `25.0` têm `equals` diferente em `BigDecimal`). Falha nessa comparação resultaria em `price_history` gerado quando o preço não mudou, ou não gerado quando deveria.

3. **Perfil Administrador sem `branchId` no JWT.** O claim `branchId` é `null` para Administrador. O serviço deve exigir o query param `branch_id` explícito nesse caso; ausência deve retornar `400`. Este comportamento é compartilhado com `001-01.cadastrar-livro` — a lógica de validação deve ser reutilizável.

4. **Dependência de `GET /books/{id}` para pré-preenchimento do formulário.** O frontend desta feature depende do endpoint `GET /books/{id}` (especificado em `001-04.visualizar-livro`) para carregar os dados atuais do livro antes de exibir o formulário. Se `001-04` não estiver implementado, o formulário de edição não pode ser montado. As duas sub-features devem ser entregues juntas ou `001-04` deve preceder `001-02` na ordem de implementação.

5. **Campo `isbn` normalizado vs. original.** Se o serviço normaliza o ISBN (remove hifens) antes de persistir, o valor exibido no formulário de edição (lido via `GET /books/{id}`) será o normalizado. O frontend deve exibir o valor normalizado, não o original enviado pelo usuário. Isso é consistente com o comportamento de `001-01.cadastrar-livro`, mas deve ser verificado na implementação para evitar divergência de exibição.
