# Listar Livros — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `001-00.catalogo-livros`. Implementa a tela `/books` — listagem paginada do catálogo da filial com filtros, ordenação e seleção de livros para impressão de etiquetas em lote.

Do lado do backend, esta feature não introduz nenhum endpoint novo: o contrato de `GET /books` já está integralmente especificado em `001-00.catalogo-livros/tech.md`. Esta especificação cobre exclusivamente:

- O contrato de consumo do endpoint `GET /books` pelo frontend.
- As regras de exibição diferenciada por perfil (controles visíveis vs. ocultos).
- O mecanismo de seleção de livros e passagem de IDs para o fluxo de impressão de etiquetas (`002-02`).
- Os estados de interface (lista vazia, carregamento, erro).

Camadas afetadas: somente frontend React (TypeScript). Nenhuma tabela nova ou alteração de schema.

Domínios que este frontend consome:

| Domínio | Endpoint | Direção |
|---------|----------|---------|
| Catálogo (`001-00`) | `GET /books` | leitura — listagem paginada com filtros |
| Autenticação (`000-02`) | `useAuth` hook | leitura — perfil e `branchId` do JWT |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. O schema já existe definido em `000-01.modelagem-dados` e os índices complementares necessários para filtros e ordenação foram especificados em `001-00.catalogo-livros/tech.md` (changeSet `002-book-catalog-indexes`):

- `idx_book_branch_condition` — filtro por `condition` dentro da filial
- `idx_book_branch_category` — filtro por `category` dentro da filial
- `idx_book_branch_active` — exclusão de `active = false`
- `idx_book_registered_at` — ordenação por data de cadastro

Nenhum índice adicional é necessário para esta sub-feature.

### Estratégia de migração

Não aplicável. Nenhuma alteração de banco de dados.

## Contratos de API

O endpoint consumido por esta feature está integralmente especificado em `001-00.catalogo-livros/tech.md`, seção `GET /books`. Reproduzem-se aqui apenas os parâmetros relevantes ao comportamento da tela.

### `GET /books` — resumo de consumo

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Query params utilizados por esta tela:**

  | Parâmetro | Tipo | Obrigatório | Comportamento na tela |
  |-----------|------|-------------|----------------------|
  | `condition` | `string` | não | filtro por condição; valores: `"new"` ou `"used"` |
  | `category` | `string` | não | filtro exato por categoria |
  | `min_price` | `number` | não | faixa de preço — limite inferior (inclusivo) |
  | `max_price` | `number` | não | faixa de preço — limite superior (inclusivo) |
  | `sort` | `string` | não | campo de ordenação: `"title"`, `"sale_price"` ou `"registered_at"` (padrão: `"registered_at"`) |
  | `direction` | `string` | não | `"asc"` ou `"desc"` (padrão: `"desc"`) |
  | `page` | `integer` | não | página 0-based; incrementado pela paginação da tela |
  | `size` | `integer` | não | padrão `20`; configurável pela tela até `100` |
  | `branch_id` | `UUID` | não | enviado apenas pelo perfil `Administrador` quando operar em contexto de filial específica |

- **Resposta esperada `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "category": "string",
        "condition": "new|used",
        "sale_price": 0.00,
        "stock_quantity": 0,
        "shelf_location": "string|null"
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

- **Status codes relevantes para a tela:**

  | Código | Comportamento no frontend |
  |--------|--------------------------|
  | `200` | renderiza lista; se `content` vazio, exibe estado vazio |
  | `400` | exibe mensagem de filtro inválido; não redireciona |
  | `401` | `PrivateRoute` redireciona para `/login` |
  | `403` | não ocorre neste endpoint (todos os perfis têm acesso) |
  | `500` | exibe mensagem genérica de erro |

## Comportamento por perfil

O perfil do usuário é lido do JWT via `useAuth` (definido em `000-02.autenticacao`). A distinção de visibilidade de controles ocorre exclusivamente no frontend — o backend aplica a mesma autorização de escopo de filial para todos os perfis.

| Controle | Administrador | Gerente | Catalogador | Caixa |
|----------|:---:|:---:|:---:|:---:|
| Lista de livros (leitura) | sim | sim | sim | sim |
| Filtros de condição, categoria e faixa de preço | sim | sim | sim | sim |
| Ordenação por coluna | sim | sim | sim | sim |
| Botão "Novo Livro" → `/books/new` | sim | sim | sim | não |
| Link de item → `/books/:id` | sim | sim | sim | sim |
| Checkbox de seleção para etiquetas | sim | sim | sim | não |
| Botão "Imprimir Etiquetas" | sim | sim | sim | não |

> O perfil `Caixa` não vê os checkboxes de seleção nem o botão "Imprimir Etiquetas". Esses elementos devem ser condicionalmente omitidos no JSX — não apenas desabilitados — para evitar confusão visual.

## Mecanismo de seleção para impressão de etiquetas

A seleção de livros para impressão é um estado local da tela (`/books`). O fluxo é:

1. O usuário marca um ou mais checkboxes nos itens da lista.
2. O estado de seleção é mantido em memória local (`useState` ou similar) como `Set<string>` de UUIDs.
3. O botão "Imprimir Etiquetas" fica ativo somente quando `selection.size > 0`.
4. Ao acionar "Imprimir Etiquetas", o frontend navega para `/labels/print` com os IDs selecionados como query param: `/labels/print?books=id1,id2,...` (rota da feature `002-02.imprimir-etiquetas`).
5. A seleção não persiste entre navegações — ao retornar para `/books`, o estado é zerado.

> A rota `/labels/print` pertence à feature `002-02.imprimir-etiquetas`, ainda não especificada. Esta feature depende apenas da capacidade de navegar para ela com os IDs; o contrato de recebimento desses IDs deve ser definido em `002-02`.

## Estrutura de componentes frontend

| Arquivo | Responsabilidade |
|---------|----------------|
| `src/pages/BooksPage.tsx` | Página principal; orquestra filtros, paginação, seleção e chamada ao serviço |
| `src/components/books/BookList.tsx` | Tabela ou grid de itens; recebe `books`, `onSelect`, `showActions` via props |
| `src/components/books/BookListItem.tsx` | Item individual da lista; renderiza campos mínimos + checkbox condicional |
| `src/components/books/BookFilters.tsx` | Painel de filtros: condição, categoria, faixa de preço; emite evento `onFilter` |
| `src/components/books/BookSortControls.tsx` | Controles de ordenação por título, preço, data de cadastro |
| `src/components/books/BookPagination.tsx` | Navegação entre páginas; exibe `total_elements` e `total_pages` |
| `src/services/bookService.ts` | Função `listBooks(params)` que constrói a query string e chama `GET /books` |
| `src/types/book.ts` | Types TypeScript: `BookSummary`, `BookListParams`, `BookPage` |

> `showActions` é um booleano derivado do perfil do usuário (`roles` inclui `Administrador`, `Gerente` ou `Catalogador`). Quando `false`, `BookList` e `BookListItem` omitem os checkboxes e o botão "Imprimir Etiquetas".

## Estados de interface

| Estado | Gatilho | Comportamento |
|--------|---------|---------------|
| Carregando | `GET /books` em andamento | exibe skeleton ou spinner sobre a lista |
| Lista vazia | `content: []` na resposta | exibe mensagem "Nenhum livro cadastrado nesta filial" (ou "Nenhum livro encontrado para os filtros aplicados" quando filtros ativos) |
| Erro de rede/500 | falha na requisição | exibe mensagem genérica com botão "Tentar novamente" |
| Filtro inválido (400) | parâmetro fora do conjunto aceito | exibe mensagem inline no painel de filtros; não limpa a lista anterior |
| Seleção ativa | `selection.size > 0` | botão "Imprimir Etiquetas" habilitado; contador de selecionados visível |

## Navegação

Rotas de entrada e saída desta tela:

| Origem | Rota | Observação |
|--------|------|-----------|
| Home (`/`) | `→ /books` | link no card "Catálogo de Livros" (visível para todos os perfis via `modulePermissions.ts`) |
| Sidebar | `→ /books` | entrada "Catálogo de Livros → Listar Livros" (visível para todos os perfis autenticados) |

| Destino | Rota | Gatilho |
|---------|------|---------|
| Formulário de cadastro | `/books/new` | botão "Novo Livro" (Administrador, Gerente, Catalogador) |
| Visualização de livro | `/books/:id` | clique no item da lista (todos os perfis) |
| Impressão de etiquetas | `/labels/print?books=id1,id2,...` | botão "Imprimir Etiquetas" (Administrador, Gerente, Catalogador) |

## Requisitos de qualidade

- [ ] I/O-bound identificado? A chamada `GET /books` é I/O-bound no backend; o virtual thread já está previsto em `001-00.catalogo-livros/tech.md`. No frontend, nenhum requisito especial.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Não aplicável — esta sub-feature é exclusivamente frontend.
- [ ] Dados sensíveis tratados adequadamente? O payload da listagem não expõe CPF, CNPJ, senha ou token. O `branchId` do JWT é usado apenas para escopo de filial, nunca exibido diretamente.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `GET /books` aceita todos os perfis autenticados; a diferenciação de controles de ação (botão "Novo Livro", checkboxes, botão "Imprimir Etiquetas") é inteiramente frontend e não expõe dados — apenas oculta elementos de UI.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `/books` autenticado como `Catalogador`; verificar que a lista exibe título, autor, categoria, condição, preço e quantidade de estoque para cada item.
- Aplicar filtro `condition = "used"`; verificar que apenas livros com `condition = "used"` aparecem na lista.
- Aplicar filtros combinados (condição + categoria + faixa de preço); verificar que apenas livros que satisfazem todos os critérios são retornados.
- Ordenar por `title ASC`; verificar ordem alfabética na resposta.
- Ordenar por `sale_price DESC`; verificar ordem decrescente de preços.
- Navegar para a página 2 (`page=1`); verificar que os itens corretos são exibidos.
- Selecionar dois livros e acionar "Imprimir Etiquetas"; verificar navegação para `/labels/print?books=id1,id2`.
- Clicar em item da lista; verificar navegação para `/books/:id`.
- Clicar em "Novo Livro"; verificar navegação para `/books/new`.

### Casos de erro esperados

- Enviar `condition = "invalid"` como filtro → backend retorna `400`; frontend exibe mensagem de erro sem limpar a lista.
- Backend retorna `500`; frontend exibe mensagem genérica com opção de retry.
- Lista vazia (filial sem livros): verificar exibição de mensagem de estado vazio, não de erro.
- Lista vazia com filtros ativos: verificar mensagem diferenciada ("nenhum livro encontrado para os filtros").

### Casos de autorização

- Usuário autenticado com perfil `Caixa` acessa `/books`; verificar ausência de checkbox de seleção, ausência do botão "Imprimir Etiquetas" e ausência do botão "Novo Livro".
- Usuário autenticado com perfil `Catalogador` acessa `/books`; verificar presença de checkbox de seleção, botão "Imprimir Etiquetas" e botão "Novo Livro".
- Requisição sem cookie `auth_token`; verificar redirecionamento para `/login` pelo `PrivateRoute`.
- JWT expirado; verificar redirecionamento para `/login`.

### Casos de borda das regras de negócio

- Filial sem nenhum livro cadastrado: verificar exibição da mensagem de estado vazio ao acessar `/books` (resposta `200` com `content: []`).
- Selecionar livros em uma página, navegar para a página 2 e verificar que a seleção da página 1 é mantida (ou documentar que é zerada — comportamento deve ser explicitado na implementação).
- Administrador acessando `/books` sem `branch_id` como query param; verificar que o backend usa o `branchId` do JWT (ou trata o caso conforme especificado em `001-00`).
- Administrador passando `branch_id` explícito; verificar que a listagem exibe livros da filial informada.

## Riscos técnicos e dependências

1. **Dependência de `002-02.imprimir-etiquetas` para o destino de navegação.** O botão "Imprimir Etiquetas" navega para `/labels/print?books=id1,id2,...`, mas a feature `002-02` ainda não possui `tech.md`. A rota e o formato do query param devem ser acordados entre as duas features antes da implementação. Risco: incompatibilidade de contrato de navegação se as duas forem implementadas em paralelo sem alinhamento.

2. **Estado de seleção ao paginar.** A seleção de checkboxes é local e baseada em UUIDs. Ao mudar de página, os itens selecionados na página anterior não estão mais visíveis. A implementação deve decidir entre: (a) manter seleção cross-page via `Set<string>` persistido durante a sessão da tela, ou (b) limpar a seleção ao mudar de página. A decisão afeta a UX do fluxo de impressão em lote com muitos livros.

3. **Ausência de busca por texto nesta tela.** A busca por texto livre é coberta por `001-05.buscar-livros` (`/books/search`). A tela `/books` oferece apenas filtros estruturados. Não há risco técnico, mas o usuário deve ser direcionado para a busca quando quiser localizar um título específico — considerar link ou botão na tela de listagem para `/books/search`.
