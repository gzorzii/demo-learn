# Imprimir Etiquetas — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `002-00.etiquetas`. Implementa a tela `/labels/print` — ponto de configuração e disparo da geração de etiquetas em lote. A geração do documento de impressão (PDF ou layout de impressão via CSS) é 100% client-side: o backend fornece exclusivamente os dados dos livros necessários para montar cada etiqueta.

O backend expõe um único endpoint novo nesta sub-feature: `GET /labels/print`, que retorna os campos de etiqueta (título, autor, ISBN, preço de venda, categoria) para um conjunto de IDs de livros. Esse endpoint já estava especificado no módulo pai `002-00.etiquetas/tech.md` — esta sub-feature confirma e detalha seu contrato sem alterá-lo.

Não há nova tabela, alteração de schema ou nova migração. Toda a lógica de layout (distribuição de etiquetas na folha A4, número de colunas e linhas, código de barras a partir do ISBN) é responsabilidade do frontend.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Backend — persistência | Leitura de `book` (campos de etiqueta) e `label_config` (dimensões do tamanho selecionado) |
| Backend — serviço | Filtro por filial e status ativo; deduplicação de IDs; ordenação por ordem de entrada |
| Frontend React | Tela `/labels/print`; seleção de tamanho; campos de cópias por livro; geração e abertura do PDF no browser |

Domínios externos afetados ou lidos:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Modelagem (`000-01`) | `book` | leitura — título, autor, ISBN, preço de venda, categoria |
| Modelagem (`000-01`) | `label_config` | leitura — tamanhos disponíveis para seleção (endpoint já definido em `002-01`) |
| Filiais (`000-01`) | `branch` | leitura implícita — escopo de filial via `book.branch_id` |
| Autenticação (`000-02`) | JWT claims (`roles`, `branchId`) | leitura — autorização e escopo de filial |
| Listagem de livros (`001-03`) | — | ponto de entrada: `/books` navega para `/labels/print?books=id1,id2,...` com IDs selecionados |
| Configurar tamanhos (`002-01`) | `label_config` | consumo do `GET /labels/sizes` já especificado; ponto de saída para `/labels/sizes` |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Esta sub-feature não cria tabelas, não adiciona colunas e não introduz novos changeSets. A geração do documento de impressão é client-side e não persiste estado no banco.

Tabelas lidas (já existentes pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`):

| Tabela | Colunas lidas | Por quê |
|--------|--------------|---------|
| `book` | `id`, `title`, `author`, `isbn`, `category`, `sale_price`, `branch_id`, `active` | Dados exibidos em cada etiqueta; `branch_id` e `active` para filtro de isolamento |
| `label_config` | `id`, `name`, `width_cm`, `height_cm`, `is_default`, `branch_id` | Tamanhos disponíveis para seleção (via `GET /labels/sizes` de `002-01`) |

### Estratégia de migração

Não aplicável. Nenhuma alteração de banco de dados nesta sub-feature.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. Perfil `Caixa` → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil `Administrador` (cujo `branchId` no JWT pode ser `null`), o `branch_id` deve ser fornecido como query param.

---

### `GET /labels/print`

Retorna os dados necessários para renderização das etiquetas de um conjunto de livros. O frontend consome este endpoint ao carregar a rota `/labels/print?books=id1,id2,...` e usa os campos retornados para montar o documento de impressão inteiramente no browser.

> O endpoint usa comportamento tolerante por design: livros de outras filiais ou inativos são silenciosamente omitidos — não causam erro. Isso evita erros de runtime quando a seleção feita em `/books` inclui um livro que foi desativado entre a seleção e a chamada ao endpoint.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Validação |
  |-----------|------|-------------|-----------|
  | `books` | `string` | sim | lista de UUIDs separados por vírgula; mínimo 1 UUID; máximo 100 UUIDs; cada item deve ser UUID v4/v7 válido; duplicatas são aceitas (deduplicadas internamente) |
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis; ausência para Administrador sem `branchId` no JWT → `400` |

- **Lógica de consulta:**

  ```sql
  SELECT id, title, author, isbn, category, sale_price
  FROM   book
  WHERE  id = ANY(:ids)
    AND  branch_id = :branchId
    AND  active = true
  ```

  Após a consulta, o serviço reordena os resultados seguindo a ordem original dos IDs recebidos no parâmetro `books` (ordenação aplicada na camada de serviço; o banco não garante a ordem do `ANY`).

- **Response `200`:**

  ```json
  {
    "books": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "isbn": "string|null",
        "category": "string",
        "sale_price": 0.00
      }
    ]
  }
  ```

  > O campo `isbn` é necessário para que o frontend gere o código de barras (encoding EAN-13 ou Code 128 — decisão de implementação do frontend). Se `isbn` for `null`, o frontend deve renderizar a etiqueta sem código de barras ou com placeholder — não é responsabilidade do backend garantir ISBN preenchido.

  > O campo `sale_price` reflete o preço de venda vigente em `book.sale_price` no momento da chamada. Descontos ativos em `discount` / `discount_book` não são aplicados — a etiqueta sempre exibe o preço de tabela.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Dados retornados com sucesso; `books` pode ser array vazio se todos os IDs forem de outra filial ou de livros inativos |
  | `400` | Parâmetro `books` ausente ou vazio; mais de 100 IDs na lista; UUID malformado em qualquer posição da lista; Administrador sem `branch_id` no query param e sem `branchId` no JWT |
  | `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` |
  | `500` | Erro inesperado no servidor |

- **Edge cases:**
  - Livros de outra filial misturados com livros válidos: apenas os da filial correta aparecem no resultado, sem `404`.
  - Todos os IDs de outra filial ou todos inativos: `200` com `books: []`.
  - UUIDs duplicados na entrada: deduplicados antes da query; cada livro aparece uma única vez na resposta.
  - Livro com `active = false`: omitido silenciosamente do resultado.
  - `isbn` nulo em `book`: campo retornado como `null`; frontend trata a ausência.
  - Lista com exatamente 100 IDs: aceita; 101 → `400`.

---

### Endpoints existentes consumidos por esta tela (sem alteração)

A tela `/labels/print` também consome `GET /labels/sizes` (especificado integralmente em `002-01.configurar-tamanhos-etiqueta/tech.md`) para popular o dropdown de seleção de tamanho. Nenhuma alteração nesse contrato é necessária.

## DTOs de domínio

Os DTOs abaixo já foram definidos no módulo pai `002-00.etiquetas/tech.md` no pacote `com.ciet.demo_learn.labels`. Esta sub-feature os utiliza sem modificação:

```
LabelPrintDataResponse   — resposta de GET /labels/print
                           campos: books (List<LabelBookItem>)

LabelBookItem            — item dentro de LabelPrintDataResponse
                           campos: id (UUID), title (String), author (String),
                                   isbn (String|null), category (String), salePrice (BigDecimal)
```

> `salePrice` é mapeado de `book.sale_price` direto, sem consulta a `discount` ou `discount_book`. Isso é intencional — ver regra de negócio 9 do `business.md`.

## Estrutura de componentes frontend

| Arquivo | Responsabilidade |
|---------|----------------|
| `src/pages/LabelPrintPage.tsx` | Página principal; lê `?books=` da URL; chama `GET /labels/print`; exibe lista de livros com campos de cópias; aciona geração do PDF |
| `src/components/labels/LabelSizeSelector.tsx` | Dropdown de tamanho; consome resultado de `GET /labels/sizes`; emite evento `onSizeChange` |
| `src/components/labels/LabelCopiesInput.tsx` | Campo numérico de cópias por livro; valida mínimo 1, inteiro positivo |
| `src/components/labels/LabelPreviewGrid.tsx` | (opcional) Prévia visual das etiquetas distribuídas na folha A4 antes da geração |
| `src/services/labelService.ts` | `fetchLabelData(bookIds, branchId?)`: chama `GET /labels/print`; `fetchSizes(branchId?)`: chama `GET /labels/sizes` |
| `src/types/label.ts` | Types TypeScript: `LabelBookItem`, `LabelPrintDataResponse`, `LabelSizeResponse`, `LabelPrintConfig` |

> A biblioteca de geração de código de barras e de construção do PDF (ex.: `jsbarcode`, `bwip-js`, `jspdf`, `pdf-lib`) não é especificada neste módulo — é decisão de implementação do frontend.

## Estados de interface

| Estado | Gatilho | Comportamento |
|--------|---------|---------------|
| Sem parâmetros `books` | URL sem `?books=` ou `?books=` vazio | Exibe aviso informando que nenhum livro foi selecionado; botão "Gerar PDF" desabilitado |
| Carregando dados | `GET /labels/print` em andamento | Exibe skeleton ou spinner sobre a lista de livros |
| Dados carregados | Resposta `200` com `books` não vazio | Exibe lista com campos de cópias e dropdown de tamanho habilitados |
| Resultado vazio | Resposta `200` com `books: []` | Exibe mensagem informando que nenhum livro encontrado para os IDs informados; botão "Gerar PDF" desabilitado |
| Erro de rede / `500` | Falha na chamada ao backend | Exibe mensagem genérica com botão "Tentar novamente" |
| Tamanho não selecionado | Usuário aciona "Gerar PDF" sem selecionar tamanho | Exibe erro de validação no dropdown; não inicia geração |
| Cópias inválidas | Cópias = 0, negativo ou não numérico | Exibe erro inline no campo correspondente; não gera PDF |
| Geração em andamento | PDF sendo composto no browser | Botão "Gerar PDF" desabilitado durante a geração para evitar clique duplo |
| PDF gerado | Documento pronto | Aberto em nova aba para impressão ou download; nenhuma chamada ao backend |

## Navegação

| Origem | Rota | Observação |
|--------|------|-----------|
| Listagem de livros (`001-03`) | `/books` + seleção + "Imprimir Etiquetas" | Ponto de entrada principal; passa `?books=id1,id2,...` |
| Menu lateral | entrada "Etiquetas → Imprimir Etiquetas" | Acesso direto sem pré-seleção; tela exibe aviso de "nenhum livro selecionado" |

| Destino | Rota | Gatilho |
|---------|------|---------|
| Configurar tamanhos | `/labels/sizes` | Botão "Configurar Tamanhos" na tela; retorno preserva estado de seleção de tamanho da sessão |
| Listagem de livros | `/books` | Botão "Cancelar / Voltar" |

> O estado do tamanho de etiqueta selecionado deve ser preservado enquanto o usuário estiver na mesma sessão de navegação (state de React Router ou Context). Ao navegar para `/labels/sizes` e retornar, o dropdown deve recuperar o tamanho previamente escolhido.

## Requisitos de qualidade

- [ ] I/O-bound identificado? `GET /labels/print` executa uma query `WHERE id = ANY(:ids)` contra PostgreSQL — operação I/O-bound; candidata a virtual threads (habilitado por padrão no Java 25 com Spring Boot 4). No pior caso são 100 IDs em uma única query — sem N+1.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Os DTOs `LabelPrintDataResponse` e `LabelBookItem` são Java records — compatíveis com AOT. A entidade JPA `Book` (lida neste endpoint) deve estar coberta por `reflect-config.json` se AOT for ativado (já previsto no módulo `001-00.catalogo-livros`).
- [ ] Dados sensíveis tratados adequadamente? O endpoint não expõe CPF, CNPJ, senha ou token. `branch_id` é UUID sem informação pessoal. `sale_price` é dado público do catálogo.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `Caixa` → `403` em `GET /labels/print`. `Catalogador`, `Gerente` e `Administrador` têm acesso completo. Isolamento por filial garantido pelo filtro `branch_id = :branchId` na query.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `/labels/print?books=id1,id2` autenticado como `Catalogador`; verificar que o backend retorna `200` com `books` contendo os campos `id`, `title`, `author`, `isbn`, `category` e `sale_price` para cada livro válido da filial.
- Verificar que os livros são retornados na mesma ordem dos IDs informados no parâmetro `books`.
- Verificar que a tela exibe os campos de cópias por livro e o dropdown de tamanhos populado via `GET /labels/sizes`.
- Selecionar um tamanho, definir cópias válidas para cada livro e acionar "Gerar PDF"; verificar que o PDF é aberto no browser sem chamada ao backend para geração do documento.
- Acionar "Configurar Tamanhos" na tela; verificar navegação para `/labels/sizes`; retornar e verificar que o tamanho selecionado anteriormente está preservado.
- Acionar "Cancelar / Voltar"; verificar navegação para `/books`.

### Casos de erro esperados

- `GET /labels/print` sem parâmetro `books` → `400`.
- `GET /labels/print?books=` (vazio) → `400`.
- `GET /labels/print` com 101 UUIDs → `400`.
- `GET /labels/print` com UUID malformado (`books=abc,id2`) → `400`.
- Administrador chamando `GET /labels/print` sem `branch_id` no query param e sem `branchId` no JWT → `400`.
- Acionar "Gerar PDF" sem selecionar tamanho → validação frontend; botão bloqueado; mensagem exibida.
- Acionar "Gerar PDF" com cópias = 0 em algum livro → validação frontend; campo marcado com erro; PDF não gerado.
- Acionar "Gerar PDF" com cópias negativas → mesmo comportamento anterior.

### Casos de autorização

- `Caixa` chamando `GET /labels/print` → `403`.
- `Caixa` tentando acessar `/labels/print` no frontend → botão "Imprimir Etiquetas" em `/books` não exibido para `Caixa` (conforme `001-03`); rota `/labels/print` deve ser protegida por `RoleRoute` permitindo apenas `Administrador`, `Gerente` e `Catalogador`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`; frontend redireciona para `/login`.

### Casos de borda das regras de negócio

- IDs de livros de outra filial misturados com IDs válidos: verificar que apenas os livros da filial do usuário aparecem no resultado; sem `404`.
- Todos os IDs de outra filial: verificar `200` com `books: []`; tela exibe mensagem de resultado vazio e desabilita "Gerar PDF".
- IDs de livros `active = false`: verificar que livros inativos são omitidos silenciosamente.
- UUIDs duplicados na entrada (`books=id1,id1,id2`): verificar que `id1` aparece uma única vez na resposta.
- Livro com `isbn = null`: verificar que o campo `isbn` é retornado como `null` sem erro; frontend deve tratar a ausência (etiqueta sem código de barras ou com placeholder).
- `sale_price` de livro com desconto ativo em `discount_book`: verificar que o endpoint retorna o preço de tabela (`book.sale_price`), sem aplicar nenhum desconto.
- URL `/labels/print` acessada sem parâmetro `books` pelo menu lateral: verificar que a tela exibe aviso de "nenhum livro selecionado" e desabilita "Gerar PDF" sem fazer chamada ao backend.

## Riscos técnicos e dependências

1. **Dependência direta de `001-03.listar-livros` como ponto de entrada.** O botão "Imprimir Etiquetas" e o formato `?books=id1,id2,...` são definidos em `001-03`. O contrato do query param deve ser idêntico em ambos os lados. O `tech.md` de `001-03` já documenta a navegação para `/labels/print?books=...`. Qualquer mudança no separador, número máximo de IDs ou formato (vírgula vs. multi-param) exige coordenação entre as duas features — risco de regressão se implementadas em paralelo por agentes distintos sem sincronização.

2. **Geração de código de barras é responsabilidade exclusiva do frontend.** O backend fornece `isbn` como string bruta (ex.: `"9788535914849"`). A biblioteca de barcode e o encoding (EAN-13 para ISBNs de 13 dígitos, Code 128 como fallback) são decisão de implementação do frontend. Se o ISBN armazenado em `book.isbn` não for um ISBN-13 válido (dado que o campo é TEXT sem validação de formato no banco), a biblioteca pode falhar silenciosamente — o frontend deve tratar erros de encoding por etiqueta sem bloquear a geração das demais.

3. **Limite de 100 IDs por requisição.** A seleção de livros em `/books` é feita via checkboxes com estado local (`001-03`). Não há limite de seleção imposto pela tela de listagem. Se o usuário selecionar mais de 100 livros e navegar para `/labels/print`, a chamada ao backend retornará `400`. A tela `/labels/print` deve validar o número de IDs antes de chamar o backend e exibir mensagem adequada se o limite for excedido — ou a tela `/books` deve limitar a seleção a 100 itens. A decisão de onde impor o limite deve ser tomada durante a implementação.

4. **Estado de tamanho de etiqueta não persistido entre sessões.** A regra de negócio 10 do `business.md` especifica que o tamanho selecionado é preservado "enquanto na mesma sessão de navegação". Isso implica armazenamento em memória React (state ou Context) — não em `localStorage` ou cookie. Ao fechar o browser ou recarregar a aba, o estado é perdido. Esse comportamento é intencional e está fora de escopo (ver seção "Fora de escopo" do `business.md`).

5. **`sale_price` pode mudar entre a seleção do livro e a geração do PDF.** Se o preço de um livro for alterado por outro usuário após a tela `/labels/print` ser carregada (dados já em tela), as etiquetas serão geradas com o preço do momento do carregamento (não refletindo a atualização). Como o PDF é gerado client-side com os dados já recebidos, não há mecanismo de refresh automático. Risco baixo no contexto de uso, mas deve ser documentado para a equipe de QA evitar falso-positivo em testes de preço.
