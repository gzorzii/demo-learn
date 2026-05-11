# Métodos de Pagamento — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz que define o contrato de dados do domínio de métodos de pagamento. A tabela `payment_method` já foi criada pelo changeSet `001-initial-schema` de `000-01.modelagem-dados` — este módulo não emite nova migração de schema. O módulo documenta os índices necessários, as invariantes de uso da tabela e o contrato de API do endpoint compartilhado que o PDV (004-xx) consome para listar os métodos ativos de uma filial.

Toda a gestão (criação e alternância de status) está especificada na sub-feature `008-01.configurar-metodos-pagamento`. Este documento cobre apenas o que é transversal ao módulo: schema, índices, e o endpoint de leitura consumido pelo PDV.

Camadas afetadas: persistência (JPA sobre PostgreSQL 18) e backend Spring Boot (endpoint de leitura). Nenhum endpoint novo de escrita é definido aqui.

Domínios externos que este módulo lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório de cada método de pagamento |
| Usuários/Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — autorização via JWT |
| PDV (`004-xx`) | — | fornecimento — `GET /payment-methods` é consumido pelo PDV para listar opções de pagamento no caixa |
| Vendas (`000-01`) | `sale_payment` | leitura indireta — `sale_payment.payment_method_id` referencia `payment_method.id`; registros de venda que usaram um método permanecem intactos mesmo após desativação |

---

## Modelo de dados

### Tabelas existentes utilizadas pelo módulo

A tabela `payment_method` já existe pelo changeSet `001-initial-schema`. Este módulo **não cria novas tabelas**.

#### `payment_method`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `name` | `TEXT` | NOT NULL | — | unicidade por filial verificada no serviço (case-insensitive); sem `UNIQUE` constraint no banco |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | controla visibilidade no PDV |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável após criação |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada PATCH |

> Não existe campo de taxa, percentual de processamento, ou tipo de método (enum). O cadastro é estritamente informativo — `name` é texto livre.

> A unicidade de `name` por filial (comparação case-insensitive) é verificada na camada de serviço com `LOWER(name)` antes de persistir. Não há `UNIQUE` constraint no banco (política do schema: validações de unicidade baseadas em regra de negócio ficam no serviço).

> Métodos desativados (`active = false`) não são excluídos. Registros em `sale_payment` que referenciam um método desativado permanecem válidos — a FK não possui `ON DELETE CASCADE`.

### Estratégia de migração

Nenhuma tabela nova é criada. O schema já existe em `000-01.modelagem-dados` (changeSet `001-initial-schema`).

Os índices abaixo devem ser adicionados em um novo changeSet (`005-payment-method-indexes`) para não modificar o changeSet original. Rollback seguro: `DROP INDEX` em cada índice sem perda de dados.

```sql
-- Query principal do PDV e da tela de gestão: todos os métodos de uma filial
CREATE INDEX idx_payment_method_branch
    ON payment_method(branch_id);

-- Query do PDV filtrada por active = true: índice parcial reduz leitura
CREATE INDEX idx_payment_method_branch_active
    ON payment_method(branch_id, active)
    WHERE active = true;
```

> O índice `idx_payment_method_branch_active` é crítico para o PDV: a cada abertura da tela de venda, o PDV lista os métodos ativos da filial. O índice parcial (`WHERE active = true`) mantém a estrutura pequena mesmo quando há muitos métodos desativados historicamente.

---

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. O `branch_id` de escopo é sempre extraído do claim `branchId` do JWT — o cliente nunca informa a filial como parâmetro.

---

### `GET /payment-methods`

Lista os métodos de pagamento ativos da filial do usuário autenticado. Este endpoint é o ponto de integração com o PDV (004-xx): o caixa chama este endpoint para obter as opções disponíveis no momento da venda.

> O endpoint retorna apenas métodos com `active = true`. A lógica de gestão completa (incluindo métodos inativos) está em `008-01` e usa o mesmo endpoint com parâmetro diferente — ver detalhes em `008-01.configurar-metodos-pagamento/tech.md`.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`

  > `Catalogador` não tem acesso ao PDV nem à configuração de métodos de pagamento. O acesso do `Caixa` a este endpoint é necessário para o funcionamento do PDV.

- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `activeOnly` | `boolean` | não | padrão `true`; quando `false`, retorna todos os métodos (ativos e inativos) — uso exclusivo de `Gerente` e `Administrador` para a tela de gestão |

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "active": true,
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
  ```

  > `branchId` não é retornado na lista — está implícito no contexto do JWT. A ordenação é `name ASC` para apresentação consistente no PDV e na tela de gestão.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada com sucesso (pode ser vazia) |
  | `400` | Parâmetro `activeOnly` com valor que não seja `true` ou `false` |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Lista vazia retorna `200` com array `[]`, nunca `404`.
  - `Caixa` só pode chamar este endpoint com `activeOnly=true` (implícito ou explícito); o parâmetro `activeOnly=false` deve retornar `403` para o perfil `Caixa`, pois a visão de inativos é exclusiva da gestão.
  - O `Administrador` sem `branchId` no JWT (Administrador global) deve retornar `400` — não é possível listar métodos sem escopo de filial definido.

---

## DTOs de domínio

Os DTOs abaixo cobrem os contratos de saída deste módulo. São definidos como Java records no pacote `com.ciet.demo_learn.payment`.

```
PaymentMethodResponse   — item de GET /payment-methods (leitura pelo PDV e pela tela de gestão)
```

O DTO de criação e o de toggle de status estão especificados em `008-01.configurar-metodos-pagamento/tech.md`.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado: `GET /payment-methods` executa query em PostgreSQL — candidato a virtual thread (Java 25 / Project Loom, habilitado por padrão com Spring Boot 4).
- [ ] `GET /payment-methods` está no caminho de abertura do PDV: deve completar em baixa latência. O índice `idx_payment_method_branch_active` é obrigatório antes de ativar o módulo em produção.
- [ ] GraalVM AOT: records Java são compatíveis. Entidade `PaymentMethod` com `@Entity` deve estar registrada em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis: nenhuma coluna em `payment_method` contém CPF, CNPJ, senha ou token.
- [ ] Autorização por perfil coberta: `Caixa` tem acesso de leitura com `activeOnly=true`; `Gerente` e `Administrador` têm acesso completo; `Catalogador` não tem acesso a nenhum endpoint deste módulo.
- [ ] Isolamento por filial: `branch_id` extraído do JWT em todos os endpoints — nunca aceito como parâmetro de escrita do cliente.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Listar métodos com `activeOnly=true` para filial com dois métodos ativos e um inativo; verificar que apenas os dois ativos retornam, ordenados por `name ASC`.
- Listar métodos com `activeOnly=false` (Gerente) para filial com métodos ativos e inativos; verificar que todos retornam.
- Listar métodos para filial sem nenhum método cadastrado; verificar `200` com array `[]`.

**Casos de erro esperados**
- `GET /payment-methods?activeOnly=invalido` → `400`.
- `Administrador` sem `branchId` no JWT chamando `GET /payment-methods` → `400`.

**Casos de autorização**
- `Catalogador` chamando `GET /payment-methods` → `403`.
- `Caixa` chamando `GET /payment-methods` sem parâmetro → `200` (retorna apenas ativos).
- `Caixa` chamando `GET /payment-methods?activeOnly=false` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.

**Edge cases de regras de negócio**
- Filial com método recém-desativado: chamada imediata seguinte ao PDV (`activeOnly=true`) não deve retornar o método desativado.
- Método desativado com vendas anteriores em `sale_payment`: listar com `activeOnly=false` deve retornar o método; as vendas anteriores não são afetadas.

---

## Riscos técnicos e dependências

1. **Dependência do PDV (004-xx):** O endpoint `GET /payment-methods` é o ponto de integração com o PDV. O módulo PDV ainda não possui tech.md — a implementação do PDV assumirá que este endpoint existe e segue o contrato aqui definido. Ordem recomendada: implementar 008 antes de qualquer sub-feature do 004 que dependa de listagem de métodos de pagamento.

2. **Parâmetro `activeOnly` compartilhado entre PDV e gestão:** O mesmo endpoint serve dois perfis com comportamentos diferentes (PDV só vê ativos; gestão vê todos). A separação via `activeOnly` e a restrição de perfil para `activeOnly=false` devem ser verificadas na camada de serviço, não apenas na documentação. Se o PDV e a tela de gestão evoluírem para requisitos muito distintos, pode ser necessário separar em endpoints distintos numa iteração futura.

3. **Sem exclusão de métodos:** A ausência de DELETE e a preservação histórica são intencionais. Se um método acumulou muitos registros desativados ao longo do tempo, a query `activeOnly=false` pode retornar listas longas. Para o volume esperado de livrarias de pequeno e médio porte, isso não representa risco; paginação pode ser adicionada futuramente se necessário.
