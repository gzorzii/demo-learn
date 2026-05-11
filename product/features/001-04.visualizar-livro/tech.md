# Visualizar Livro — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Esta feature é de leitura pura: não cria, altera nem remove dados. Ela consome o endpoint `GET /books/{id}` já definido em `001-00.catalogo-livros/tech.md` e o expõe no frontend como a tela `/books/:id`.

Camadas afetadas: frontend React (nova página `BookDetailPage`) e o endpoint de backend `GET /books/{id}` (já especificado no módulo pai). Nenhuma nova tabela, nenhum novo endpoint e nenhuma migração de schema são necessários.

Domínios lidos pela tela:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Catálogo (`001-00`) | `book`, `book_image`, `book_stock` | leitura — dados exibidos na tela |
| Auth (`000-02`) | JWT (`roles`, `branchId`) | leitura — controle de visibilidade de ações na UI |

A diferenciação de ações visíveis por perfil (botão "Editar", botão "Gerenciar Imagens", link "Histórico de Preços") é responsabilidade do frontend, baseada nos `roles` do JWT via `useAuth`. O backend já aplica o isolamento por filial no próprio endpoint — não há lógica adicional de autorização a introduzir.

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Todas as tabelas consumidas por esta feature (`book`, `book_image`, `book_stock`) já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Os índices relevantes para a consulta já foram definidos em `001-00.catalogo-livros/tech.md` (changeSet `002-book-catalog-indexes`):

- `idx_book_image_order ON book_image(book_id, "order")` — ordenação da galeria de imagens por `book_image.order ASC`
- `idx_book_stock_book ON book_stock(book_id, branch_id)` — leitura de `stock_quantity`

### Estratégia de migração

Nenhuma migração necessária. A feature opera inteiramente sobre o schema existente.

## Contratos de API

O único endpoint consumido por esta feature é `GET /books/{id}`, já especificado em `001-00.catalogo-livros/tech.md`. Reproduz-se aqui o contrato completo para que os agentes de desenvolvimento desta sub-feature não precisem consultar o módulo pai.

### `GET /books/{id}`

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa` — todos os perfis autenticados
- **Path param:** `id` — UUID do livro (formato UUID v7)
- **Request body:** nenhum

- **Response `200`:**

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

  O campo `images` é retornado ordenado por `book_image.order ASC` e contém no máximo 10 itens (limite imposto no cadastro). Se não houver imagens, o array é vazio `[]`.

  `stock_quantity` é lido de `book_stock.quantity` via JOIN; se não existir registro, retorna `0`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `200` | Livro encontrado e pertence à filial do usuário |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Livro existe mas pertence a outra filial (o `branch_id` do livro difere do `branchId` do JWT) |
  | `404` | UUID não encontrado em `book` |
  | `500` | Erro inesperado no servidor |

- **Edge cases:**
  - O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil `Administrador`, cujo `branchId` no JWT pode ser `null`, o frontend deve enviar `branch_id` como query param para estabelecer o contexto de filial — o endpoint deve aceitar esse parâmetro para o Administrador, conforme comportamento definido no módulo pai.
  - O backend nunca retorna livros com `active = false` — `404` é retornado mesmo que o registro exista com `active = false`. Isso é consistente com a exclusão lógica definida no módulo pai.
  - Livro pertencente a outra filial retorna `403`, não `404`, para não revelar a existência do registro a usuários de filiais diferentes.

## Frontend — tela `/books/:id`

> Esta seção documenta os requisitos de comportamento da tela. Não prescreve estrutura de componentes nem padrões de código.

### Rota

`/books/:id` — registrada no `AppRouter.tsx` dentro do `PrivateRoute`/`AppLayout`. Acessível a todos os perfis autenticados (sem `RoleRoute` restritivo).

### Dados exibidos

A tela deve exibir todos os campos retornados pelo endpoint:

| Campo da resposta | Exibição |
|-------------------|----------|
| `title` | Título principal |
| `author` | Autor |
| `isbn` | ISBN (omitir label se `null`) |
| `publisher` | Editora (omitir se `null`) |
| `year` | Ano (omitir se `null`) |
| `category` | Categoria |
| `condition` | Condição (`"new"` → "Novo", `"used"` → "Usado") |
| `condition_description` | Descrição da condição (exibir apenas quando `condition = "used"` e valor não nulo) |
| `sale_price` | Preço de venda (formatado em BRL) |
| `stock_quantity` | Quantidade em estoque |
| `shelf_location` | Localização física (omitir se `null`) |
| `description` | Descrição geral (omitir se `null`) |
| `registered_at` | Data de cadastro (formatada em pt-BR) |
| `images` | Galeria de imagens na ordem do array |

### Visibilidade de ações por perfil

A lógica de visibilidade usa os `roles` do JWT via `useAuth`. Não há chamada adicional ao backend para verificar permissões.

| Ação | Destino | Perfis que visualizam |
|------|---------|----------------------|
| Botão "Editar" | `/books/:id/edit` (`001-02`) | `Administrador`, `Gerente`, `Catalogador` |
| Botão "Gerenciar Imagens" | `/books/:id/images` (`001-06`) | Todos os perfis autenticados |
| Link "Histórico de Preços" | `/books/:id/price-history` (`013-01`) | `Administrador`, `Gerente` |
| Botão "Voltar" | `/books` | Todos os perfis autenticados |

O botão "Editar" e o link "Histórico de Preços" **não devem aparecer** para o perfil `Caixa` — apenas ocultados, não desabilitados.

### Estados da tela

- **Carregando:** estado intermediário enquanto o fetch está em andamento.
- **Erro 404:** exibir mensagem "Livro não encontrado" com opção de voltar para `/books`.
- **Erro 403:** exibir mensagem de acesso negado.
- **Erro genérico (`500`):** exibir mensagem genérica de erro.
- **Sucesso:** exibir os dados do livro.

### Galeria de imagens

- Imagens exibidas na ordem do array `images` (já ordenado pelo backend por `order ASC`).
- Se `images` for vazio, exibir placeholder visual indicando ausência de imagens.
- Máximo de 10 imagens conforme limite do cadastro — não é necessário limitar no frontend.

## Requisitos de qualidade

- [ ] I/O-bound identificado? O endpoint `GET /books/{id}` executa até três consultas ao PostgreSQL (SELECT em `book`, `book_image` e `book_stock`). Candidato a virtual thread (habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] Paths com GraalVM AOT: nenhum novo componente introduzido; o endpoint já existe no módulo pai.
- [ ] Dados sensíveis: nenhum campo sensível (CPF, CNPJ, senha, token) é exibido ou trafegado nesta feature. O `branch_id` retornado é UUID sem informação pessoal.
- [ ] Autorização por perfil coberta: o backend aplica isolamento de filial via `branchId` do JWT. O frontend aplica visibilidade de ações por `roles`. Ambas as camadas devem ser verificadas.

## Estratégia de testes

### Fluxo principal (happy path)

- Usuário autenticado (`Gerente`) acessa `/books/:id` de um livro da própria filial → resposta `200` com todos os campos preenchidos, incluindo `images` ordenado por `order`.
- `images` com múltiplos itens: verificar que o array retornado segue `order ASC`.
- Livro sem imagens: verificar `images: []` na resposta.
- Livro sem `shelf_location`: verificar `shelf_location: null` na resposta.
- `stock_quantity = 0` quando não há registro em `book_stock` para a filial.
- Frontend exibe botão "Editar" e link "Histórico de Preços" para `Gerente`.
- Frontend exibe apenas botão "Gerenciar Imagens" e "Voltar" para `Caixa` (ausência dos outros botões).
- Frontend exibe botão "Editar" e "Gerenciar Imagens", mas não "Histórico de Preços", para `Catalogador`.

### Casos de erro esperados

- `GET /books/{id}` com UUID inexistente → `404`; frontend exibe "Livro não encontrado".
- `GET /books/{id}` com UUID de livro pertencente a outra filial → `403`.
- `GET /books/{id}` com `active = false` → `404` (exclusão lógica).
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

### Casos de autorização

- `Caixa` acessa `/books/:id` de livro da própria filial → `200`; botões "Editar" e "Histórico de Preços" ausentes na UI.
- `Catalogador` acessa `/books/:id` → `200`; link "Histórico de Preços" ausente na UI.
- `Administrador` acessa `/books/:id` sem passar `branch_id` → comportamento conforme definição do módulo pai.
- Usuário da filial A tenta acessar livro da filial B → `403`.

### Casos de borda das regras de negócio

- Livro `used` com `condition_description` preenchido: verificar que o campo é exibido na tela.
- Livro `new` com `condition_description = null`: verificar que o campo não aparece na tela.
- Galeria com exatamente 10 imagens: verificar renderização de todos os itens.
- `sale_price` com duas casas decimais: verificar formatação correta em BRL no frontend.

## Riscos técnicos e dependências

1. **Dependência de `GET /books/{id}` do módulo pai (`001-00`).** O contrato deste endpoint deve estar implementado antes que esta sub-feature possa ser integrada. Sem risco de conflito — a especificação já está definida.

2. **Link "Histórico de Preços" aponta para `013-01.consultar-historico-precos`** (feature não especificada ainda). O link deve existir na tela, mas o destino `/books/:id/price-history` pode retornar `404` até que a feature 013-01 seja implementada. O frontend deve tratar esse estado graciosamente.

3. **Contexto de filial para o `Administrador`.** O JWT do Administrador pode ter `branchId = null`. O comportamento do endpoint `GET /books/{id}` para este caso (aceitação de `branch_id` via query param) deve ser confirmado durante a implementação do módulo pai para garantir consistência com esta tela.
