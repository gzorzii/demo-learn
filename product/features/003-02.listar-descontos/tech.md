# Listar Descontos — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `003-00.descontos`. Implementa o endpoint `GET /discounts` e a tela `/discounts` — listagem paginada dos descontos da filial do usuário autenticado, com status de vigência calculado em runtime.

O status de cada desconto **não é armazenado em coluna** — ele é derivado dos campos `active`, `starts_at` e `ends_at` em tempo de consulta, conforme as regras de negócio do módulo. Esse cálculo ocorre na camada de serviço do backend; o banco entrega apenas os dados brutos e o serviço adiciona o campo `status` antes de serializar a resposta. A ordenação multi-grupo (ativos → agendados → expirados, cada grupo por `created_at DESC`) é implementada com expressão `CASE` no `ORDER BY` da query, evitando múltiplas consultas ao banco.

Camadas afetadas: backend (endpoint REST + serviço de domínio) e frontend React (tela `/discounts`, navegação para `003-01` e ação de remoção de `003-03`).

Domínios externos que este endpoint lê:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Schema inicial (`000-01`) | `discount`, `discount_book` | leitura |
| Autenticação (`000-02`) | JWT claim `branchId` | leitura — escopo de filial |
| Filiais (`000-01`) | `branch` | leitura indireta (via FK em `discount`) |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova é necessária. As tabelas `discount` e `discount_book` já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Este módulo requer índices complementares para suportar a filtragem por `branch_id` e a ordenação multi-grupo. Eles devem ser adicionados em um novo changeSet (`003-discount-indexes`) para não reescrever o changeSet original.

```sql
-- Filtragem de descontos por filial (principal filtro da listagem)
CREATE INDEX idx_discount_branch ON discount(branch_id);

-- Suporte à ordenação por data de criação dentro de cada grupo de status
CREATE INDEX idx_discount_branch_created ON discount(branch_id, created_at DESC);

-- Suporte à expiração: comparação de ends_at com now() é feita em todos os registros da filial
CREATE INDEX idx_discount_ends_at ON discount(ends_at) WHERE ends_at IS NOT NULL;

-- Suporte ao cálculo de status "agendado": comparação de starts_at com now()
CREATE INDEX idx_discount_starts_at ON discount(starts_at) WHERE starts_at IS NOT NULL;
```

Rollback seguro: `DROP INDEX` em cada índice sem perda de dados.

### Estratégia de migração

Apenas criação de índices em tabela já existente e populada. Não há alteração de colunas, não há migração de dados existentes. A operação é segura para rollback via `DROP INDEX`.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. O `branch_id` de escopo é extraído do claim `branchId` do JWT. O Administrador pode passar `branch_id` como query param para alternar contexto de filial, seguindo o mesmo padrão estabelecido em `001-00.catalogo-livros/tech.md`.

---

### `GET /discounts`

Retorna a listagem paginada dos descontos da filial, com status de vigência calculado em runtime.

- **Authorization:** `Administrador`, `Gerente`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `page` | `integer` | não | página (0-based, padrão: `0`) |
  | `size` | `integer` | não | itens por página (padrão: `20`, máx.: `100`) |
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Cálculo de status (aplicado na camada de serviço, campo `status` não existe no banco):**

  | Status | Condição |
  |--------|----------|
  | `expired` | `ends_at` não nulo e `ends_at < now()` — independente do valor de `active` |
  | `scheduled` | `active = true` e `starts_at` não nulo e `starts_at > now()` |
  | `active` | `active = true` e não expirado e não agendado (inclui sem `starts_at` e sem `ends_at`) |

  > A condição `expired` tem precedência sobre as demais: um desconto com `ends_at` no passado é sempre expirado, mesmo que `active = true`.

- **Ordenação padrão (não configurável pelo cliente):** ativos primeiro, depois agendados, depois expirados; dentro de cada grupo, `created_at DESC`. Implementado com expressão `CASE` no `ORDER BY`:

  ```sql
  ORDER BY
    CASE
      WHEN ends_at IS NOT NULL AND ends_at < now() THEN 3
      WHEN active = true AND starts_at IS NOT NULL AND starts_at > now() THEN 2
      ELSE 1
    END ASC,
    created_at DESC
  ```

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "scope": "book|category|author|price_range",
        "scope_summary": "string",
        "value_type": "percentage|fixed",
        "value": 0.00,
        "starts_at": "ISO-8601|null",
        "ends_at": "ISO-8601|null",
        "status": "active|scheduled|expired",
        "created_at": "ISO-8601"
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

  > `scope_summary` é um campo calculado na camada de serviço — não existe como coluna no banco. O serviço monta a string de acordo com o valor de `scope`:
  > - `book` → `"Livro individual: [N] livro(s)"` — onde N é o `COUNT` de registros em `discount_book` para o desconto.
  > - `category` → `"Categoria: [valor de discount.category]"`
  > - `author` → `"Autor: [valor de discount.author]"`
  > - `price_range` → `"Faixa de preço: R$ [min_price] – R$ [max_price]"`
  >
  > Para o scope `book`, o serviço deve buscar o count de `discount_book` para cada desconto da página. Para evitar N+1, o serviço deve executar uma única query de count agrupada por `discount_id` nos IDs da página atual e montar o mapa antes de serializar.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada com sucesso (pode ser vazia) |
  | `400` | Parâmetro de paginação inválido (ex.: `size > 100`, `page < 0`) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` tentando acessar o endpoint |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Lista vazia retorna `200` com `content: []`, não `404`.
  - O `branch_id` do JWT nunca é substituído pelo cliente, exceto para o perfil `Administrador` via query param `branch_id`. Para Gerente, o `branch_id` do JWT é sempre usado; query param `branch_id` enviado por Gerente é ignorado.
  - O campo `status` é calculado com base no instante de execução da requisição (`now()` do servidor) — não há risco de divergência com o banco.
  - Descontos com `active = false` e `ends_at` no futuro (ou nulo) não se enquadram em nenhuma das três categorias. O serviço deve tratá-los como um quarto caso interno: eles não são exibidos nas regras de `active`, `scheduled` ou `expired`. Por enquanto, o `business.md` não prevê desativação manual de descontos (apenas remoção), então `active = false` só ocorre se outro módulo fizer essa operação. Por segurança, o serviço deve incluir esses registros na resposta com status `expired` ou omiti-los — a decisão deve ser documentada na implementação. A interpretação mais conservadora é retorná-los com status `expired`.

## DTOs de domínio

Os DTOs abaixo cobrem os contratos de entrada e saída deste endpoint. São definidos como Java records no pacote `com.ciet.demo_learn.discount`.

```
DiscountSummaryResponse   — item individual no array content
DiscountPageResponse      — wrapper paginado (content, page, size, total_elements, total_pages)
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? Sim — a consulta ao banco (`discount`, `discount_book` para counts) é I/O-bound; candidato a virtual thread (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java são compatíveis. Atenção a reflexão em entidades JPA (`@Entity Discount`, `@EmbeddedId DiscountBookId`) — devem estar registrados em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis tratados adequadamente? Nenhuma coluna em `discount` ou `discount_book` contém CPF, CNPJ, senha ou token. O campo `created_by` (UUID de usuário) não é exposto na resposta desta listagem.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `GET /discounts` é restrito a `Administrador` e `Gerente`. `Catalogador` e `Caixa` recebem `403`. Usuário sem sessão recebe `401`. Isolamento por filial garantido pelo `branch_id` do JWT.

## Estratégia de testes

### Fluxo principal (happy path)

- Acessar `GET /discounts` autenticado como `Gerente` com filial que possui descontos nos três estados (ativo, agendado, expirado); verificar que a resposta contém todos e na ordem correta: ativos primeiro, agendados depois, expirados por último; dentro de cada grupo, `created_at DESC`.
- Verificar que o campo `status` é calculado corretamente para cada desconto:
  - Desconto com `ends_at` no passado → `expired`.
  - Desconto com `active = true` e `starts_at` no futuro → `scheduled`.
  - Desconto com `active = true` sem `starts_at` e sem `ends_at` → `active`.
  - Desconto com `active = true`, `starts_at` no passado e `ends_at` no futuro → `active`.
- Verificar que `scope_summary` é montado corretamente para cada tipo de escopo (`book`, `category`, `author`, `price_range`).
- Verificar paginação: filial com 25 descontos, `size=10` → `total_elements = 25`, `total_pages = 3`, `content.length = 10` na página 0.
- Filial sem descontos → `200` com `content: []`.

### Casos de erro esperados

- `GET /discounts` com `size = 200` → `400`.
- `GET /discounts` com `page = -1` → `400`.

### Casos de autorização

- Usuário com perfil `Catalogador` → `403`.
- Usuário com perfil `Caixa` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.
- `Administrador` passando `branch_id` válido como query param → listagem da filial informada.
- `Gerente` passando `branch_id` de outra filial como query param → `branch_id` ignorado; listagem retorna apenas descontos da filial do JWT.

### Casos de borda das regras de negócio

- Desconto com `ends_at = now()` (exatamente no limite) — verificar que é tratado como `expired` (condição `ends_at < now()` não é satisfeita para igualdade; implementação deve usar `<=` para o caso de fim no presente exato — a interpretação deve ser `ends_at < now()` conforme especificado no `business.md`; documentar comportamento exato).
- Desconto de escopo `book` com 0 vínculos em `discount_book` (estado inconsistente) — verificar que `scope_summary` retorna `"Livro individual: 0 livro(s)"` sem erro.
- Desconto com `starts_at` no passado e sem `ends_at`, com `active = true` → deve ser `active`.
- Filial do Administrador com `null` `branchId` no JWT sem query param `branch_id` — comportamento deve ser definido na implementação (retornar `400` pedindo `branch_id` explícito, ou retornar lista vazia).

## Riscos técnicos e dependências

1. **Dependência de `003-01.criar-desconto` para existência de dados.** O endpoint `GET /discounts` só retorna dados úteis após a feature `003-01` estar implementada. A listagem pode ser implementada e testada em isolamento com dados semeados diretamente no banco, mas a integração completa requer `003-01`. Baixo risco — as features podem ser desenvolvidas em paralelo.

2. **Dependência de `003-03.remover-desconto` para a ação de remoção na tela.** O frontend de `/discounts` deve renderizar o botão "Remover" em cada item, mas o fluxo do modal de confirmação e a chamada de remoção pertencem a `003-03`. Se as features forem implementadas em paralelo, o botão pode ser renderizado como inativo até que `003-03` esteja disponível.

3. **N+1 no cálculo de `scope_summary` para scope `book`.** Para cada desconto de escopo `book` na página, o serviço precisa do count de vínculos em `discount_book`. Se feito como query individual por desconto, gera N+1. O serviço deve executar uma única query agrupada: `SELECT discount_id, COUNT(*) FROM discount_book WHERE discount_id IN (:ids) GROUP BY discount_id` e montar o mapa em memória antes de serializar. Risco de degradação de performance se não implementado corretamente.

4. **Cálculo de status com `now()` no servidor vs. timezone do cliente.** O `now()` é sempre o instante do servidor (UTC). O frontend deve exibir as datas `starts_at` e `ends_at` convertidas para o timezone do usuário, mas o cálculo de status deve confiar no valor retornado pelo backend, não recalcular no frontend.

5. **Administrador sem `branchId` no JWT.** Conforme `000-02.autenticacao`, o campo `branchId` no JWT é `null` para o Administrador. O endpoint deve exigir `branch_id` como query param quando o `branchId` do JWT for `null`. Sem esse parâmetro, o backend não tem como determinar qual filial listar — retornar `400` com mensagem explicativa é o comportamento adequado.
