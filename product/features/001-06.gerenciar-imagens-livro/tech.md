# Gerenciar Imagens do Livro — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo de catálogo (`001-00`). Estende os endpoints e a lógica de domínio já especificados em `001-00.catalogo-livros/tech.md`, adicionando as operações de ciclo de vida das imagens: upload, reordenação e remoção. Não introduz novas tabelas — a tabela `book_image` já existe no schema `001-initial-schema` (`000-01.modelagem-dados`). Os três contratos de API (`POST /books/{id}/images`, `PATCH /books/{id}/images/reorder`, `DELETE /books/{id}/images/{imageId}`) estão declarados no `tech.md` de `001-00`; este documento os detalha com profundidade suficiente para implementação isolada.

Camadas afetadas:

- **Persistência:** leitura e escrita em `book_image`; leitura de `book` para verificação de existência e escopo de filial.
- **Armazenamento de arquivos:** escrita e remoção de arquivos no filesystem local (ambiente dev). A lógica de armazenamento deve ser encapsulada em uma interface `StorageService` para permitir substituição futura sem alteração de contrato.
- **Frontend React:** tela `/books/:id/images` — galeria com drag-and-drop ou botões de reordenação, input de upload múltiplo, e confirmação de remoção.

Domínios que esta feature lê:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Catálogo (`001-00`) | `book` | leitura — existência do livro e `branch_id` para escopo |
| Auth (`000-02`) | JWT claim `branchId`, `roles` | leitura — autorização e isolamento por filial |

## Modelo de dados

### Tabelas existentes utilizadas

#### `book_image`

Já criada pelo changeSet `001-initial-schema`. Nenhuma alteração de schema é necessária para esta feature.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| `url` | `TEXT` | NOT NULL | — | caminho ou URL do arquivo armazenado; nunca exposto como caminho de disco para o cliente |
| `order` | `INTEGER` | NOT NULL | `0` | sequência de exibição; sem UNIQUE constraint — gerenciado pela aplicação |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

> Não há constraint de banco para o limite de 10 imagens. A verificação é feita na camada de serviço via `SELECT COUNT(*) FROM book_image WHERE book_id = ?` antes de cada inserção. Isso é intencional: o schema não impõe a regra para manter a migração simples e o limite configurável no futuro.

#### `book` (leitura apenas)

Campos lidos: `id`, `branch_id`, `active`. O endpoint verifica existência e pertencimento à filial do usuário antes de qualquer operação em `book_image`.

### Índice complementar

O índice `idx_book_image_order` já está definido em `001-00.catalogo-livros/tech.md` (changeSet `002-book-catalog-indexes`):

```sql
CREATE INDEX idx_book_image_order ON book_image(book_id, "order");
```

Nenhum índice adicional é necessário para esta sub-feature.

### Estratégia de migração

Nenhuma migração nova. Todas as estruturas de banco existem desde `001-initial-schema`. O índice `idx_book_image_order` é criado pelo changeSet `002-book-catalog-indexes` definido em `001-00`. Rollback seguro: nenhuma coluna nova foi adicionada, portanto qualquer estado de migração é compatível com esta feature.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. O `branch_id` de escopo é extraído do claim `branchId` do JWT. O Administrador pode passar `branch_id` como query param para alternar contexto de filial (comportamento herdado de `001-00`).
>
> Em todas as rotas abaixo, o livro identificado por `{id}` deve: (1) existir em `book`; (2) ter `active = true` ou ser acessível mesmo inativo — a regra de negócio não menciona restrição por `active` para gerência de imagens, mas por consistência com o módulo pai, recomenda-se verificar apenas existência, não `active`; (3) pertencer à filial do usuário autenticado (exceto Administrador).

---

### `POST /books/{id}/images`

Upload de uma nova imagem para o livro. Aceita `multipart/form-data` com um único arquivo por requisição.

> A verificação do limite de 10 imagens deve ocorrer dentro de uma transação que bloqueie a linha de contagem (ex.: `SELECT COUNT(*) ... FOR UPDATE` ou tratamento de concorrência via chave de idempotência), caso múltiplas requisições simultâneas para o mesmo livro sejam possíveis. Em ambiente monothread com virtual threads, o risco é baixo, mas deve ser documentado.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path param:** `id` — UUID do livro
- **Request:** `multipart/form-data`

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `file` | `binary` | sim | Content-Type deve ser `image/jpeg`, `image/png` ou `image/webp`; tamanho máximo: 10 MB (configurável em `application.properties` via `spring.servlet.multipart.max-file-size`) |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "url": "string",
    "order": 0
  }
  ```

  O campo `url` é a URL pública servida pelo backend (ex.: `/books/{bookId}/images/{imageId}/file`), não o caminho absoluto de disco. Ver seção de riscos.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Imagem salva e registro criado em `book_image` |
  | `400` | `file` ausente, Content-Type inválido, ou arquivo excede tamanho máximo |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial |
  | `404` | Livro não encontrado |
  | `409` | Livro já possui 10 imagens (limite atingido) |
  | `500` | Erro inesperado (inclui falha de escrita no storage) |

- **Edge cases:**
  - O serviço conta `SELECT COUNT(*) FROM book_image WHERE book_id = ?`. Se `count >= 10` → `409` antes de qualquer escrita em disco.
  - O campo `order` é atribuído como `SELECT COALESCE(MAX("order"), -1) + 1 FROM book_image WHERE book_id = ?`. Se não há imagens, `order = 0`.
  - O arquivo é gravado no `StorageService` antes da inserção em `book_image`. Se a inserção falhar, o arquivo órfão deve ser removido (limpeza no bloco de exceção do serviço).
  - A validação do Content-Type deve ser feita por leitura dos primeiros bytes do arquivo (magic bytes), não apenas pelo header `Content-Type` enviado pelo cliente, para evitar upload de arquivos maliciosos renomeados.

---

### `PATCH /books/{id}/images/reorder`

Atualiza a ordem de exibição das imagens de um livro. Recebe a nova sequência completa ou parcial de imagens com seus respectivos valores de `order`.

> A reordenação substitui os valores de `order` nos registros informados. IDs de imagem não presentes no array mantêm seu `order` atual — o frontend deve enviar a lista completa para garantir consistência.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path param:** `id` — UUID do livro
- **Request body:** `application/json`

  ```json
  {
    "order": [
      { "image_id": "uuid", "order": 0 },
      { "image_id": "uuid", "order": 1 }
    ]
  }
  ```

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `order` | `array` | sim | não vazio; mínimo 1 item |
  | `order[].image_id` | `string (UUID)` | sim | UUID válido; deve pertencer ao livro identificado por `{id}` |
  | `order[].order` | `integer` | sim | >= 0 |

- **Response `200`:** lista completa de imagens do livro após a reordenação, ordenada por `order ASC`.

  ```json
  [
    { "id": "uuid", "url": "string", "order": 0 },
    { "id": "uuid", "url": "string", "order": 1 }
  ]
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Ordem atualizada com sucesso |
  | `400` | Array `order` ausente ou vazio; `image_id` não é UUID válido; valor de `order` negativo |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial |
  | `404` | Livro não encontrado, ou algum `image_id` do array não pertence ao livro `{id}` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A verificação de pertencimento dos `image_id` ao livro deve ser feita em bloco: `SELECT id FROM book_image WHERE book_id = ? AND id = ANY(?)`. Se algum ID não for encontrado → `404` com mensagem indicando o ID inválido.
  - Os `UPDATE` dos valores de `order` devem ocorrer dentro de uma única transação para evitar estado parcial.
  - Valores de `order` duplicados no array não possuem restrição de banco — a aplicação deve tratar como comportamento válido (o frontend é responsável por enviar valores únicos).

---

### `DELETE /books/{id}/images/{imageId}`

Remove uma imagem específica do livro. Exclui o registro de `book_image` e o arquivo físico do storage.

> A exclusão do arquivo no storage deve ocorrer **após** o `DELETE` bem-sucedido em `book_image`. Se a remoção do arquivo falhar, o banco já estará consistente (sem o registro); o arquivo órfão no disco será lixo silencioso. Essa ordem é preferível ao inverso (arquivo removido mas registro persistindo), que causaria URLs quebradas.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path params:**
  - `id` — UUID do livro
  - `imageId` — UUID da imagem (`book_image.id`)
- **Response `204`:** sem corpo
- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Imagem removida com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial |
  | `404` | Livro não encontrado, ou `imageId` não encontrado ou não pertence ao livro `{id}` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A verificação deve confirmar que `book_image.book_id = {id}` além de `book_image.id = {imageId}`, evitando que um usuário delete imagem de outro livro da mesma filial fornecendo apenas o `imageId` correto.
  - Após a remoção, os valores de `order` das imagens restantes **não são reordenados automaticamente** — a exibição usa `ORDER BY "order" ASC` e gaps na sequência não afetam a ordenação.
  - Falha na remoção do arquivo físico deve ser logada (nível `WARN`) mas não deve retornar `500` — o estado do banco é a fonte de verdade.

---

## DTOs de domínio

Os DTOs abaixo complementam os já definidos em `001-00.catalogo-livros/tech.md`. Os tipos `ImageUploadResponse`, `ImageReorderRequest`, `ImageOrderItem` e `ImageResponse` já estão listados no bloco de DTOs daquele documento. Este spec os detalha:

```
ImageUploadResponse     — resposta de POST /books/{id}/images
                          campos: id (UUID), url (String), order (int)

ImageResponse           — item de imagem em GET /books/{id} e resposta de PATCH reorder
                          campos: id (UUID), url (String), order (int)

ImageReorderRequest     — body de PATCH /books/{id}/images/reorder
                          campos: order (List<ImageOrderItem>)
                          validação: @NotEmpty na lista

ImageOrderItem          — item de ImageReorderRequest
                          campos: imageId (UUID, @NotNull), order (int, @Min(0))
```

Não são introduzidos DTOs novos — todos pertencem ao pacote do módulo catálogo.

## Interface de armazenamento

> A abstração do storage é obrigatória para esta feature. O objetivo é isolar o detalhe de implementação (filesystem local em dev) do contrato de domínio, permitindo substituição por S3 ou outro serviço de objetos sem alterar os endpoints ou o serviço de imagens.

A interface `StorageService` deve expor no mínimo:

| Método | Entrada | Saída | Comportamento |
|--------|---------|-------|---------------|
| `store(bookId, file)` | UUID do livro, `MultipartFile` | `String` — URL pública relativa ou absoluta | Persiste o arquivo; lança exceção se falhar |
| `delete(url)` | URL retornada por `store` | `void` | Remove o arquivo; loga `WARN` e não lança exceção se o arquivo não existir |

A implementação `LocalStorageService` deve:

- Armazenar arquivos em um diretório base configurável via `app.storage.base-path` em `application-dev.properties`.
- Gerar nome de arquivo único (ex.: UUID v4 + extensão derivada do Content-Type).
- A URL retornada por `store` deve ser uma URL relativa ao backend (ex.: `/storage/{filename}`) servida por um endpoint estático ou um controller dedicado — o cliente jamais recebe o caminho absoluto de disco.

## Requisitos de qualidade

- [ ] I/O-bound identificado? O upload (`POST`) envolve leitura do stream multipart e escrita em disco — operação I/O intensiva. Deve ser executada em virtual thread (habilitado por padrão no Java 25 com Spring Boot 4). O `DELETE` também faz I/O de disco ao remover o arquivo.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? A interface `StorageService` e sua implementação não usam reflexão — compatíveis com AOT. Atenção ao mapeamento JPA de `BookImage` (`@Entity`) que deve estar coberto por `reflect-config.json` se AOT for ativado.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna de `book_image` contém dado pessoal. A URL armazenada não deve expor caminhos de disco absolutos — verificar que `LocalStorageService` retorna sempre URLs relativas ao backend.
- [ ] Casos de autorização cobertos em todos os endpoints? Todos os três endpoints permitem os quatro perfis autenticados, com restrição de filial verificada no backend via `book.branch_id` vs. claim `branchId` do JWT.

## Estratégia de testes

### Fluxo principal (happy path)

- Fazer upload de uma imagem JPEG válida em livro com 0 imagens existentes → verificar `201`, `order = 0`, registro criado em `book_image`, arquivo gravado no storage.
- Fazer upload de uma segunda imagem em livro com 1 imagem existente → verificar `order = 1`.
- Fazer upload de múltiplas imagens em sequência até atingir 9 → verificar que todos retornam `201` e `order` é incrementado corretamente.
- Reordenar imagens de um livro com 3 imagens → verificar que os valores de `order` persistidos correspondem ao array enviado.
- Remover uma imagem → verificar `204`, ausência do registro em `book_image`, e remoção do arquivo no storage.
- Verificar que após remoção, `GET /books/{id}` retorna as imagens restantes ordenadas por `order ASC` sem o item removido.

### Casos de erro esperados

- Upload de arquivo `.pdf` (Content-Type `application/pdf`) → `400`.
- Upload de arquivo JPEG com magic bytes inválidos (arquivo renomeado) → `400`.
- Upload quando livro já possui 10 imagens → `409` com mensagem "Limite de 10 imagens atingido".
- Upload para livro inexistente → `404`.
- `PATCH /books/{id}/images/reorder` com `image_id` que pertence a outro livro → `404`.
- `PATCH /books/{id}/images/reorder` com array vazio → `400`.
- `DELETE /books/{id}/images/{imageId}` onde `imageId` pertence a outro livro → `404`.
- `DELETE /books/{id}/images/{imageId}` com `imageId` inexistente → `404`.

### Casos de autorização

- Qualquer perfil autenticado (`Caixa`, `Catalogador`, `Gerente`, `Administrador`) realizando upload em livro da própria filial → `201`.
- Qualquer perfil autenticado tentando operar em livro de outra filial → `403`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado em qualquer endpoint → `401`.

### Casos de borda das regras de negócio

- Upload simultâneo que ultrapassaria o limite de 10: dois uploads concorrentes para um livro com 9 imagens — verificar que apenas um é aceito e o outro retorna `409` (testar comportamento sob concorrência).
- Livro com imagens existentes com gaps em `order` (ex.: 0, 2, 5 após remoções) → upload adiciona imagem com `order = 6` (`max + 1`), não `3`.
- `PATCH reorder` com valores de `order` não contíguos (ex.: 0, 5, 10) → verificar que o banco persiste exatamente esses valores e a resposta os retorna ordenados.
- `GET /books/{id}` após reordenação → verificar que o campo `images` reflete a nova ordem.

## Riscos técnicos e dependências

1. **URL das imagens exposta ao frontend requer endpoint de serving.** A `book_image.url` armazenada deve ser uma URL que o browser consiga requisitar. Em dev com `LocalStorageService`, o backend deve servir os arquivos via um endpoint estático (ex.: Spring `ResourceHandler` mapeado para o diretório base) ou controller dedicado. Sem isso, as imagens aparecem no banco mas não carregam no browser. Risco: implementação incompleta se o endpoint de serving for esquecido.

2. **Validação por magic bytes exige leitura parcial do stream.** A verificação do tipo real do arquivo (além do Content-Type declarado) requer ler os primeiros bytes do `InputStream` antes de passar para o `StorageService`. Isso consome parte do stream — a implementação deve marcar e resetar o stream (`mark`/`reset`) ou usar uma cópia em buffer. Risco: implementação ingênua que consome o stream e depois falha ao gravar o arquivo.

3. **Ausência de transação entre escrita em disco e escrita no banco.** O filesystem não participa de transações JPA. A ordem definida (gravar arquivo → inserir em `book_image`) expõe uma janela de falha: se a inserção no banco falhar após a gravação em disco, o arquivo fica órfão. A implementação do `StorageService` deve prever limpeza no bloco `catch` do serviço. Em volume alto, limpeza periódica de órfãos pode ser necessária — fora do escopo desta iteração.

4. **Remoção de arquivo após `DELETE` pode falhar silenciosamente em produção.** A estratégia de logar `WARN` e continuar é aceitável em dev. Em produção com storage externo (S3), a falha na remoção gera custo de armazenamento acumulado. A interface `StorageService` deve ser projetada para suportar retry assíncrono no futuro sem mudança de assinatura.

5. **Dependência de `001-00.catalogo-livros`.** Os endpoints desta feature (`POST /books/{id}/images`, `PATCH /books/{id}/images/reorder`, `DELETE /books/{id}/images/{imageId}`) pertencem ao mesmo controller do catálogo. A implementação desta sub-feature pressupõe que o controller base (`/books`) já existe. Se `001-00` não estiver implementado, esta feature não pode ser entregue isoladamente.
