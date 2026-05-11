# Configurar Métodos de Pagamento — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature de gestão do domínio de métodos de pagamento. Expõe os endpoints que permitem ao Gerente e ao Administrador visualizar todos os métodos da filial (ativos e inativos), adicionar novos métodos e alternar o status de um método existente (ativo ↔ inativo).

A tabela `payment_method` e o endpoint de leitura para o PDV estão definidos no módulo raiz `008-00.metodos-pagamento`. Este documento especifica apenas os endpoints de mutação e o comportamento completo da listagem administrativa (que inclui métodos inativos).

Camadas afetadas: persistência (JPA sobre PostgreSQL 18), serviço de domínio (validação de unicidade de nome, toggle de status), e frontend React com rota `/payment-methods`.

Domínios externos lidos ou escritos por esta sub-feature:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório |
| Usuários/Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do ator e autorização |
| Vendas (`000-01`) | `sale_payment` | leitura indireta — existência de FK impede exclusão; desativação não afeta registros históricos |

---

## Modelo de dados

### Tabelas existentes utilizadas pela sub-feature

A tabela `payment_method` já existe pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. Esta sub-feature **não cria novas tabelas** e **não emite novas migrações**. Os índices necessários estão definidos no módulo raiz `008-00` (changeSet `005-payment-method-indexes`).

#### `payment_method` — invariantes de escrita

> A unicidade do `name` por filial deve ser verificada na camada de serviço usando comparação `LOWER(name) = LOWER(?)` antes de qualquer `INSERT`. A ausência de `UNIQUE` constraint no banco é intencional (política do schema descrita em `000-01.modelagem-dados`). Sem essa verificação, dois métodos com nomes diferenciados apenas por capitalização (ex.: "PIX" e "pix") seriam persistidos, violando a regra de negócio 5.

> O campo `updated_at` deve ser atualizado para `now()` em toda operação PATCH.

> Não existe operação de DELETE — a tabela não deve receber DELETE por nenhum endpoint deste módulo. A FK em `sale_payment.payment_method_id` (sem `ON DELETE CASCADE`) é garantia adicional no banco, mas a proibição é de negócio, não apenas técnica.

### Estratégia de migração

Nenhuma migração nova é emitida por esta sub-feature. Os índices necessários estão declarados no changeSet `005-payment-method-indexes` do módulo raiz `008-00`.

---

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é sempre extraído do claim `branchId` do JWT — o cliente nunca informa a filial.

---

### `GET /payment-methods`

Lista todos os métodos de pagamento da filial (ativos e inativos) para exibição na tela de gestão. O comportamento completo deste endpoint — incluindo o parâmetro `activeOnly` e o uso pelo PDV — está especificado no módulo raiz `008-00.metodos-pagamento/tech.md`. Esta sub-feature usa o mesmo endpoint com `activeOnly=false` (implícito quando chamado pela tela de gestão).

> Não há endpoint separado para a listagem administrativa — o parâmetro `activeOnly` diferencia os contextos de uso (PDV versus gestão). Ver `008-00` para o contrato completo.

---

### `POST /payment-methods`

Cria um novo método de pagamento para a filial do usuário autenticado.

- **Authorization:** `Gerente`, `Administrador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `string` | sim | não vazio; máx. 100 caracteres; após trim, não pode ser igual (case-insensitive) ao `name` de nenhum outro método da mesma filial (ativo ou inativo) |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "name": "string",
    "active": true,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
  ```

  > Um método recém-criado sempre inicia com `active = true`. O campo `branchId` não é retornado — está implícito no contexto do JWT.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Método criado com sucesso |
  | `400` | `name` ausente, vazio após trim, ou excede 100 caracteres |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` |
  | `409` | Já existe um método com o mesmo nome (case-insensitive) na filial, independentemente do status |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A verificação de unicidade deve usar `LOWER(name)` em ambos os lados: `LOWER(pm.name) = LOWER(?)` com `branch_id = ?`. Inclui métodos inativos — o nome reservado não é liberado ao desativar.
  - O `branch_id` do novo registro é extraído do claim `branchId` do JWT; o cliente não informa a filial.
  - O `Administrador` sem `branchId` no JWT deve receber `400` — não é possível criar método sem escopo de filial.
  - Nomes com espaços extras nas extremidades são tratados com `trim()` antes de persistir e antes da verificação de unicidade.

---

### `PATCH /payment-methods/{id}`

Alterna o status (`active`) de um método de pagamento existente (toggle: ativo → inativo ou inativo → ativo).

> O PATCH é intencional em vez de PUT: apenas o campo `active` é mutável após a criação. O `name` não é editável para preservar a integridade histórica dos registros em `sale_payment` que referenciam o método pelo `id`. Se o nome precisasse ser editável no futuro, exigiria revisão de escopo.

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `id` — UUID do método de pagamento
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `active` | `boolean` | sim | `true` para ativar; `false` para desativar |

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "name": "string",
    "active": false,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
  ```

  > `updatedAt` reflete o instante da operação (`now()`).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Status atualizado com sucesso |
  | `400` | Body ausente ou campo `active` ausente/inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa`; ou método pertence a outra filial |
  | `404` | UUID não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço deve verificar que `payment_method.branch_id` corresponde ao `branchId` do JWT antes de atualizar. Se pertencer a outra filial, retornar `403` (não `404`) — não vazar existência de métodos de outras filiais.
  - Aplicar o toggle mesmo que o valor enviado seja igual ao valor atual (idempotência parcial): a operação é aceita, `updated_at` é atualizado, e a resposta retorna o estado atual. Não retornar `409` neste caso — toggle com mesmo valor é operação válida.
  - Após desativar um método, chamadas subsequentes ao PDV (`GET /payment-methods` com `activeOnly=true`) não retornarão o método. Registros históricos em `sale_payment` permanecem íntegros.

---

## DTOs de domínio

Os DTOs abaixo cobrem os contratos de entrada e saída desta sub-feature. São definidos como Java records no pacote `com.ciet.demo_learn.payment`, junto ao `PaymentMethodResponse` definido em `008-00`.

```
PaymentMethodCreateRequest   — body de POST /payment-methods
PaymentMethodToggleRequest   — body de PATCH /payment-methods/{id}
PaymentMethodResponse        — resposta compartilhada (definida em 008-00); usada em POST e PATCH
```

---

## Requisitos de qualidade

- [ ] I/O-bound identificado: `POST /payment-methods` executa SELECT de verificação de unicidade + INSERT; `PATCH /payment-methods/{id}` executa SELECT + UPDATE — ambos candidatos a virtual threads (Java 25 / Project Loom).
- [ ] GraalVM AOT: records Java são compatíveis. `PaymentMethod` com `@Entity` deve estar em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis: nenhuma coluna em `payment_method` contém CPF, CNPJ, senha ou token.
- [ ] Autorização por perfil coberta em todos os endpoints: `Caixa` e `Catalogador` não têm acesso a `POST` nem a `PATCH`. `Gerente` opera apenas na própria filial (isolamento por `branch_id` no JWT). `Administrador` opera na filial definida pelo `branchId` do JWT.
- [ ] Isolamento por filial verificado no backend: `branch_id` extraído do JWT na criação; verificado contra `payment_method.branch_id` no toggle.
- [ ] Verificação de unicidade de nome usa `LOWER()` em ambos os lados da comparação para garantir insensibilidade a maiúsculas/minúsculas.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Criar método "PIX" em filial sem métodos; verificar `201`, `active = true`, `name = "PIX"`.
- Criar método "Dinheiro"; criar segundo método "Cartão de Crédito"; listar com `activeOnly=false` → dois métodos retornam ordenados por `name ASC`.
- Desativar "Cartão de Crédito" via PATCH com `active = false`; verificar `200` com `active = false` e `updatedAt` atualizado.
- Reativar "Cartão de Crédito" via PATCH com `active = true`; verificar `200` com `active = true`.
- Criar método com espaços nas extremidades no nome (ex.: `"  PIX  "`); verificar que é persistido como `"PIX"` (trim aplicado).
- Listar com `activeOnly=true` após desativar método; verificar que método desativado não aparece.

**Casos de erro esperados**
- `POST /payment-methods` com `name` vazio → `400`.
- `POST /payment-methods` com `name` com apenas espaços → `400` (após trim resulta em vazio).
- `POST /payment-methods` com `name = "dinheiro"` quando já existe `"Dinheiro"` na filial → `409`.
- `POST /payment-methods` com `name = "DINHEIRO"` quando já existe `"dinheiro"` na filial → `409`.
- `POST /payment-methods` com `name` de método inativo já existente na filial → `409` (nome reservado mesmo em inativos).
- `PATCH /payment-methods/{id}` com UUID inexistente → `404`.
- `PATCH /payment-methods/{id}` com body sem campo `active` → `400`.
- `Administrador` sem `branchId` no JWT chamando `POST /payment-methods` → `400`.

**Casos de autorização**
- `Caixa` chamando `POST /payment-methods` → `403`.
- `Caixa` chamando `PATCH /payment-methods/{id}` → `403`.
- `Catalogador` chamando `POST /payment-methods` → `403`.
- `Catalogador` chamando `PATCH /payment-methods/{id}` → `403`.
- `Gerente` da filial A chamando `PATCH /payment-methods/{id}` de método da filial B → `403`.
- Requisição sem cookie `auth_token` → `401` em todos os endpoints.
- JWT expirado → `401` em todos os endpoints.

**Edge cases de regras de negócio**
- Desativar método utilizado em venda anterior: verificar que `sale_payment` preserva o `payment_method_id` e que a venda histórica não é afetada.
- Toggle com mesmo valor atual (`active = true` em método já ativo): verificar que retorna `200` com `updated_at` atualizado (sem erro).
- Criar dois métodos em filiais diferentes com o mesmo nome; verificar que ambos são aceitos (unicidade é por filial, não global).

---

## Riscos técnicos e dependências

1. **Dependência do endpoint `GET /payment-methods` definido em `008-00`:** Esta sub-feature reutiliza o mesmo endpoint para a listagem administrativa (`activeOnly=false`). A lógica de autorização do parâmetro `activeOnly` (apenas `Gerente` e `Administrador` podem usar `false`) deve ser implementada no mesmo controller/service que serve o PDV. Qualquer alteração no comportamento de `GET /payment-methods` pode impactar simultaneamente a tela de gestão e o PDV.

2. **Condição de corrida na verificação de unicidade:** A verificação de unicidade de nome (SELECT + INSERT separados) é suscetível a race condition se dois Gerentes criarem o mesmo método simultaneamente. Para o volume esperado de uso (configuração realizada raramente por um usuário por vez), o risco é baixo. Se concorrência for identificada em produção, aplicar `SELECT ... FOR UPDATE` ou adicionar `UNIQUE INDEX` parcial com `LOWER(name)` via expressão no PostgreSQL como safeguard.

3. **Nome não é editável:** A decisão de não expor edição de `name` é consciente para preservar legibilidade histórica (um `sale_payment` referenciando `payment_method_id` "Dinheiro" deve continuar fazendo sentido). Se o produto demandar edição de nome no futuro, será necessário avaliar o impacto nos relatórios do módulo 011 que podem exibir o nome do método em transações históricas.

4. **Sem paginação na listagem:** A listagem retorna todos os métodos da filial. Para o domínio de livraria, o número de métodos de pagamento é naturalmente pequeno (estimativa: menos de 10 por filial). Paginação não é necessária agora, mas deve ser adicionada se o requisito de negócio mudar (ex.: importação em lote de métodos).
