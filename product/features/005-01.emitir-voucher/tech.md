# Emitir Voucher — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Esta feature implementa a camada de aplicação responsável por receber e processar a requisição de emissão de voucher via `POST /vouchers`, contrato já especificado em `005-00.vouchers/tech.md`. Não introduz novas tabelas, migrações ou endpoints adicionais — toda a estrutura de dados pertence ao módulo raiz `005-00`.

Camadas afetadas: serviço de domínio de voucher (validação, criação, resposta), controlador REST e frontend React (formulário `/vouchers/new` com autocomplete de cliente e tela de confirmação).

Domínios externos lidos por esta feature:

| Domínio | Tabela | Direção | Motivo |
|---------|--------|---------|--------|
| Clientes (`007-xx`) | `customer` | leitura | validar existência do cliente e sua filial |
| Filiais (`000-01`) | `branch` | leitura indireta | `branch_id` extraído do JWT; não há query direta |
| Usuários/Auth (`000-02`) | JWT (`sub`, `branchId`, `roles`) | leitura | identificar emissor, filial e perfil |
| Vouchers (`005-00`) | `voucher` | escrita | criação do registro |

O endpoint `GET /customers/search` documentado em `005-00.vouchers/tech.md` é uma dependência de contrato deste formulário. Ele pertence ao domínio `customer` (007-xx) e deve estar disponível antes que o formulário `/vouchers/new` possa ser integrado.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova. Nenhuma alteração de schema. As tabelas `voucher` e `voucher_usage` com seus índices já foram definidas em `005-00.vouchers/tech.md` e criadas pelo changeSet `001-initial-schema` + `002-voucher-indexes`.

Esta feature apenas **escreve** na tabela `voucher` via `POST /vouchers`.

### Tabelas utilizadas — referência rápida

Ver definição completa em `005-00.vouchers/tech.md`.

**`voucher`** — campos escritos na emissão:

| Coluna | Valor na criação |
|--------|-----------------|
| `id` | gerado pelo banco via `uuidv7()` |
| `branch_id` | extraído do claim `branchId` do JWT |
| `customer_id` | `customerId` do request body, validado contra `customer.id` + `customer.branch_id` |
| `initial_value` | `initialValue` do request body; deve ser > 0 |
| `remaining_balance` | igual a `initial_value`; nunca aceitar valor diferente via request |
| `issued_by` | `sub` do JWT (UUID do usuário autenticado) |
| `issued_at` | `now()` pelo banco; não aceitar valor externo |
| `active` | `TRUE` (default) |

> A imutabilidade pós-criação de `initial_value`, `customer_id` e `issued_at` é garantida na camada de serviço: nenhum endpoint de atualização é exposto por este módulo. Conforme regra 9 do `business.md`.

### Estratégia de migração

Não aplicável — nenhum changeSet novo emitido por esta feature.

---

## Contratos de API

### `POST /vouchers`

Contrato completo definido em `005-00.vouchers/tech.md`. Reproduzido aqui apenas com os detalhes de validação específicos desta feature para referência do agente implementador.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `customerId` | `UUID` | sim | deve referenciar um `customer` existente com `customer.branch_id` igual ao `branchId` do JWT; rejeitar com `404` se não encontrado ou pertencer a outra filial |
  | `initialValue` | `Number` (decimal) | sim | deve ser > 0; precisão máxima de 2 casas decimais; rejeitar com `400` se ≤ 0 ou formato inválido |

- **Processamento esperado (ordem de validação):**
  1. Verificar que o JWT contém perfil `Gerente` ou `Administrador`; se não → `403`.
  2. Validar que `customerId` está presente no body; se não → `400`.
  3. Validar que `initialValue` está presente e > 0 com precisão ≤ 2 casas decimais; se não → `400`.
  4. Consultar `customer` pelo `customerId`; se não encontrado → `404`.
  5. Verificar que `customer.branch_id` == `branchId` (claim JWT); se diferente → `404` (não vazar existência de clientes de outras filiais).
  6. Criar registro em `voucher` com `remaining_balance = initial_value` e `active = true`.
  7. Retornar `201` com o corpo especificado em `005-00.vouchers/tech.md`.

- **Response `201`:** ver `005-00.vouchers/tech.md` — inclui campo `code` (igual ao `id` UUID).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Voucher criado com sucesso |
  | 400 | `initialValue` ≤ 0, formato inválido, precisão excedida, ou `customerId` ausente |
  | 401 | Usuário não autenticado (JWT ausente ou expirado) |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 404 | `customerId` não encontrado ou pertence a outra filial |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O `branch_id` nunca é informado pelo cliente — é extraído exclusivamente do JWT. Qualquer campo `branchId` enviado no body deve ser ignorado.
  - O `remaining_balance` é sempre definido pelo servidor como igual a `initial_value`; valor diferente no body (se enviado) deve ser ignorado ou rejeitado.
  - Não há limite de vouchers ativos por cliente — múltiplos `POST /vouchers` para o mesmo `customerId` são permitidos.
  - Quando chamado programaticamente por `006-01.registrar-compra-lote`, o comportamento é idêntico: o mesmo endpoint, as mesmas regras, o mesmo contrato de resposta.

---

### `GET /customers/search`

Endpoint de busca de clientes para o autocomplete do formulário de emissão. Contrato completo definido em `005-00.vouchers/tech.md`. Pertence ao domínio `customer` (007-xx).

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `q` | `String` | sim | mínimo 2 caracteres; busca por `ILIKE '%q%'` em `customer.name`, `customer.cpf_cnpj`, `customer.phone` |

- **Restrição de filial:** busca restrita aos clientes com `customer.branch_id` igual ao `branchId` do JWT.
- **Resposta:** lista de até 20 resultados com `id`, `name`, `cpfCnpj`, `phone`.
- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Resultados retornados (pode ser lista vazia) |
  | 400 | `q` ausente ou com menos de 2 caracteres |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão |
  | 500 | Erro inesperado |

> Este endpoint deve ser implementado no domínio `customer`. A feature `005-01` é consumidora, não proprietária. Nenhum agente implementador de `005-01` deve criar esse endpoint — apenas consumi-lo.

---

## Frontend — tela `/vouchers/new`

### Rota e proteção

| Rota | Perfis permitidos | Componente |
|------|------------------|------------|
| `/vouchers/new` | `Gerente`, `Administrador` | `VoucherNewPage` |

A rota deve ser envolvida por `RoleRoute` com `allowedRoles={MODULE_PERMISSIONS['vouchers']}` conforme padrão de `000-03.home-navegacao`.

### Formulário

O formulário possui dois campos e um botão de confirmação:

| Campo | Tipo de input | Comportamento |
|-------|--------------|---------------|
| Cliente | Autocomplete / typeahead | Chama `GET /customers/search?q=<texto>` após 2 caracteres digitados; exibe `name`, `cpfCnpj`, `phone`; armazena `id` selecionado |
| Valor do voucher (R$) | Numérico decimal | Aceita até 2 casas decimais; validação client-side antes do submit |

### Estado pós-submissão (confirmação)

Após resposta `201` bem-sucedida, a tela `/vouchers/new` transita para estado de confirmação sem troca de rota:

- Exibe o campo `code` (= `id` UUID) do voucher recém-criado com destaque visual para facilitar a leitura pelo Gerente.
- Exibe `customerName` e `initialValue` para confirmação visual.
- Botão "Voltar à listagem" navega para `/vouchers`.

Esse comportamento é especificado no `business.md` como "estado pós-submissão" na mesma rota — implementar via estado React local (`useState`), não via nova rota.

### Navegação

- Entrada: botão "Emitir Voucher" na tela `/vouchers` (feature `005-02`).
- Botão "Cancelar" no formulário: navega para `/vouchers` sem criar registro.
- Após confirmação da leitura do código: botão "Voltar à listagem" navega para `/vouchers`.

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? O `POST /vouchers` realiza dois acessos ao banco sequencialmente (SELECT em `customer`, INSERT em `voucher`) — candidato a virtual thread (Project Loom / Java 25) para não bloquear a carrier thread durante I/O.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Não aplicável a esta feature — sem uso de reflection dinâmica ou proxies não detectáveis.
- [ ] Dados sensíveis tratados adequadamente? `cpf_cnpj` retornado por `GET /customers/search` deve ser mascarado no DTO de saída (decisão final do módulo `007-xx`). O `POST /vouchers` não processa CPF diretamente.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? Sim — `POST /vouchers` rejeita `Caixa` e `Catalogador` com `403`; `GET /customers/search` idem. Ver seção de testes.
- [ ] `branch_id` nunca extraído do body? Confirmado — exclusivamente via claim `branchId` do JWT em todos os endpoints deste módulo.

---

## Estratégia de testes

Cenários que devem ser cobertos:

**Fluxo principal (happy path)**
- `POST /vouchers` com `customerId` válido (mesma filial) e `initialValue = 80.00`: verificar que o voucher é criado com `remaining_balance = 80.00` e `active = true`, e que a resposta `201` contém `code` igual ao `id`.
- `POST /vouchers` com `initialValue = 0.01` (mínimo válido acima de zero): deve retornar `201`.
- `GET /customers/search?q=silva`: deve retornar clientes da filial cujo `name` contenha "silva" (case-insensitive).
- `GET /customers/search?q=Silva`: deve retornar os mesmos resultados (busca insensível a maiúsculas).
- Emissão de múltiplos vouchers para o mesmo cliente: todos devem ser criados sem conflito.

**Casos de erro esperados**
- `POST /vouchers` sem `customerId`: deve retornar `400` com mensagem "Cliente é obrigatório".
- `POST /vouchers` com `initialValue = 0`: deve retornar `400`.
- `POST /vouchers` com `initialValue = -10`: deve retornar `400`.
- `POST /vouchers` com `initialValue = 10.999` (3 casas decimais): deve retornar `400` ou ser truncado — comportamento deve ser definido e documentado na implementação.
- `POST /vouchers` com `customerId` de outra filial: deve retornar `404` (não vazar existência).
- `POST /vouchers` com `customerId` inexistente: deve retornar `404`.
- `GET /customers/search?q=s` (1 caractere): deve retornar `400`.
- `GET /customers/search` sem `q`: deve retornar `400`.

**Casos de autorização**
- `Caixa` faz `POST /vouchers`: deve retornar `403`.
- `Catalogador` faz `POST /vouchers`: deve retornar `403`.
- `Caixa` faz `GET /customers/search`: deve retornar `403`.
- `Catalogador` faz `GET /customers/search`: deve retornar `403`.
- Usuário não autenticado (sem cookie JWT) em qualquer endpoint: deve retornar `401`.
- `Gerente` da filial A faz `POST /vouchers` com `customerId` da filial B: deve retornar `404`.

**Edge cases de regras de negócio**
- Verificar que `remaining_balance` na resposta é sempre igual a `initial_value` na criação, independentemente de qualquer campo extra enviado no body.
- Verificar que `issued_by` no banco é o `sub` do JWT do usuário autenticado, não um campo enviado pelo cliente.
- Verificar que `branch_id` no banco é o `branchId` do JWT, mesmo que o body contenha um campo `branchId` diferente.
- Uso programático: simular chamada de `006-01` ao `POST /vouchers` com o mesmo contrato — verificar que o comportamento é idêntico ao fluxo manual.

---

## Riscos técnicos e dependências

1. **Dependência bloqueante: `GET /customers/search` (domínio `007-xx`):** O formulário de emissão de voucher não pode ser integrado no frontend sem este endpoint. Se `007-xx` não estiver implementado, o campo de autocomplete de cliente ficará sem dados. A integração backend do `POST /vouchers` pode ser desenvolvida independentemente (usando `customerId` diretamente), mas o fluxo de UX completo só estará disponível após `007-xx` entregar o endpoint de busca.

2. **Uso programático por `006-01.registrar-compra-lote`:** A feature `006-01` reutiliza o `POST /vouchers` para emissão opcional de voucher ao registrar um lote de compra. O agente implementador de `006-01` deve consumir exatamente o contrato aqui especificado — nenhuma variação de endpoint ou campo é permitida. O risco é de acoplamento implícito: se `005-01` alterar o contrato de resposta, `006-01` será afetado.

3. **Ausência de `customer` ativo no schema:** A tabela `customer` (ver `000-01.modelagem-dados`) não possui coluna `active`. Isso significa que não é possível filtrar clientes inativos na busca de autocomplete ou na validação do `customerId`. Se o módulo `007-xx` introduzir soft-delete via coluna `active` na tabela `customer`, a validação do `POST /vouchers` (passo 4 do processamento) deverá ser atualizada para rejeitar clientes inativos com `404`. Esta feature assume que todos os registros em `customer` são válidos para vínculo.

4. **Precisão decimal de `initialValue`:** A validação de "precisão máxima de 2 casas decimais" no campo `initialValue` não está coberta por constraint no banco (o tipo `NUMERIC(10,2)` trunca silenciosamente no PostgreSQL, não rejeita). A rejeição de valores com mais de 2 casas decimais deve ser implementada na camada de validação do DTO antes da persistência, para evitar perda silenciosa de dados.
