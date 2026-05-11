# Resgatar Voucher no PDV — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Esta feature é inteiramente de responsabilidade do frontend — não introduz endpoints novos, tabelas ou migrações. Ela define como o cliente React, no contexto da tela `/pdv`, consome dois contratos de API já existentes para vincular um cliente à venda e validar um voucher antes da finalização.

O voucher é aplicado como **estado local do frontend**: o valor do abatimento é calculado e exibido no resumo da venda sem nenhuma escrita no banco. O débito real em `voucher.remaining_balance`, a inserção em `voucher_usage` e a atualização de `sale.voucher_id` ocorrem exclusivamente em `004-04.finalizar-venda`, dentro da transação de persistência da venda.

Camadas afetadas: apenas o frontend React (`/pdv`). Nenhuma camada de backend é modificada por esta feature.

Domínios externos consumidos (somente leitura):

| Domínio | Endpoint | Finalidade |
|---------|----------|-----------|
| Clientes (`007-03`) | `GET /customers/search` | Localizar cliente para vincular à venda |
| Vouchers (`005-00`) | `GET /vouchers/lookup?code={code}` | Validar voucher e obter saldo disponível |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. As tabelas `sale`, `voucher` e `voucher_usage` já existem pelo changeSet `001-initial-schema` (`000-01.modelagem-dados`). Esta feature não emite migrações.

### Estado local do frontend (não persistido)

O carrinho da venda é gerenciado como estado local React enquanto `status = pending`. Os campos abaixo são mantidos em memória no frontend para compor o payload de `004-04.finalizar-venda`:

| Campo local | Tipo | Descrição |
|-------------|------|-----------|
| `selectedCustomer` | objeto ou `null` | Cliente vinculado: `{ id, name, cpfCnpj, phone }` |
| `appliedVoucher` | objeto ou `null` | Voucher aplicado: `{ id, remainingBalance, customerName }` |
| `voucherDiscount` | `number` | Valor efetivamente descontado: `min(remainingBalance, totalCarrinho)` |
| `totalWithDiscount` | `number` | `subtotalCarrinho - voucherDiscount` |

> Esses campos nunca são enviados ao backend isoladamente. Compõem o payload único de `POST /sales` em `004-04`.

### Estratégia de migração

Não aplicável. Nenhuma migração é emitida por esta feature.

---

## Contratos de API

Esta feature não define novos endpoints. Ela **consome** dois contratos já especificados em outras features. A seguir, a documentação de uso no contexto do PDV — incluindo restrições específicas desta feature que os contratos existentes já cobrem.

---

### Contrato consumido: `GET /customers/search` (definido em `007-03.listar-clientes`)

Usado no campo de autocomplete de cliente na tela `/pdv`.

- **Authorization:** `Caixa`, `Gerente`, `Administrador`
- **Query params usados pelo PDV:**

  | Parâmetro | Tipo | Obrigatório | Regra |
  |-----------|------|-------------|-------|
  | `q` | `string` | sim | mínimo 2 caracteres; dispara após 2 caracteres digitados no campo de busca do PDV |

- **Response `200` (shape relevante para o PDV):**

  ```json
  [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "cpfCnpj": "123.456.789-00",
      "phone": "(11) 99999-9999"
    }
  ]
  ```

  > Máximo de 20 resultados. Busca restrita à filial extraída do JWT — o PDV nunca vê clientes de outras filiais.

- **Status codes relevantes para o PDV:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Resultados retornados (pode ser lista vazia — exibir mensagem "Nenhum cliente encontrado") |
  | 400 | `q` com menos de 2 caracteres — o frontend deve bloquear a chamada antes de enviá-la |
  | 401 | Sessão expirada — redirecionar para login |
  | 403 | Perfil sem permissão — não deve ocorrer para Caixa, Gerente ou Administrador |
  | 500 | Exibir mensagem de erro genérica; preservar estado do carrinho |

- **Comportamento esperado no PDV:**
  - O campo de busca de cliente só aceita digitação após o carrinho ter ao menos um item.
  - A chamada é disparada a cada alteração no campo com `q.length >= 2` (debounce recomendado: 300ms).
  - Ao selecionar um cliente da lista, o objeto é armazenado em `selectedCustomer` no estado local.
  - Enquanto um cliente estiver vinculado, o campo de código de voucher é habilitado.
  - O botão "Desvincular cliente" remove `selectedCustomer` e `appliedVoucher` do estado local (e zera `voucherDiscount`).

---

### Contrato consumido: `GET /vouchers/lookup?code={code}` (definido em `005-00.vouchers`)

Usado para validar o código do voucher informado pelo Caixa antes de aplicá-lo ao estado local.

- **Authorization:** `Caixa`, `Gerente`, `Administrador`
- **Query params usados pelo PDV:**

  | Parâmetro | Tipo | Obrigatório | Regra |
  |-----------|------|-------------|-------|
  | `code` | `UUID` | sim | UUID do voucher informado pelo Caixa; enviado ao submeter o campo |
  | `customerId` | `UUID` | não | UUID do cliente vinculado (`selectedCustomer.id`); deve ser sempre enviado quando há cliente vinculado |

  > O parâmetro `customerId` é enviado junto com `code` para que o backend valide o vínculo cliente-voucher em uma única chamada. Se o voucher pertencer a outro cliente, o backend retorna `403` e o frontend exibe a mensagem correspondente.

- **Response `200` (shape relevante para o PDV):**

  ```json
  {
    "id": "uuid",
    "customerName": "Maria Silva",
    "remainingBalance": 30.00,
    "active": true,
    "status": "active"
  }
  ```

- **Status codes e mensagens a exibir no PDV:**

  | Código | Quando ocorre | Mensagem ao Caixa |
  |--------|--------------|-------------------|
  | 200 | Voucher válido, ativo e com saldo | — (aplica o voucher ao estado local) |
  | 400 | `code` ausente ou UUID inválido | "Código de voucher inválido." |
  | 401 | Sessão expirada | Redirecionar para login |
  | 403 | Voucher de outra filial, ou `customerId` informado não corresponde ao dono do voucher | "Este voucher não pertence ao cliente selecionado." |
  | 404 | Voucher não encontrado | "Voucher não encontrado." |
  | 409 | Voucher existe mas está inativo ou com saldo zerado | "Voucher indisponível: inativo ou sem saldo." |
  | 500 | Erro inesperado | "Erro ao consultar voucher. Tente novamente." |

- **Comportamento esperado no PDV após resposta `200`:**
  1. Armazenar `{ id, remainingBalance, customerName }` em `appliedVoucher`.
  2. Calcular `voucherDiscount = min(appliedVoucher.remainingBalance, subtotalCarrinho)`.
  3. Recalcular `totalWithDiscount = subtotalCarrinho - voucherDiscount`.
  4. Exibir no resumo da venda: valor do abatimento e novo total.
  5. Se `remainingBalance > subtotalCarrinho`: exibir o saldo remanescente que ficará no voucher após a finalização — `remainingBalance - subtotalCarrinho`.
  6. Habilitar o botão "Remover voucher".

---

## Regras de validação no frontend (sem chamada de API)

As regras abaixo são verificadas inteiramente no cliente, antes de qualquer chamada de API, para evitar chamadas desnecessárias e dar feedback imediato ao Caixa.

| Regra de negócio | Validação no cliente | Mensagem |
|-----------------|---------------------|----------|
| RN2: cliente deve estar vinculado antes de buscar voucher | Campo de código de voucher permanece desabilitado enquanto `selectedCustomer` for `null` | "Vincule um cliente antes de aplicar um voucher." |
| RN6: apenas um voucher por venda | Campo de código de voucher permanece desabilitado enquanto `appliedVoucher` não for `null` | "Já existe um voucher aplicado nesta venda." |
| RN3: código de voucher não pode ser vazio | Validação de campo obrigatório antes do submit | "Informe o código do voucher." |
| Carrinho deve ter >= 1 item | Campo de busca de cliente permanece desabilitado com carrinho vazio | — (bloqueio visual, sem mensagem de voucher) |

---

## Regras de cálculo local (sem chamada de API)

> O cálculo de abatimento é feito no frontend porque o voucher é provisório. O backend recalculará o valor correto na finalização para garantir consistência. O valor exibido ao Caixa deve ser idêntico ao que será persistido — a lógica deve ser a mesma em ambos os lados.

```
voucherDiscount     = min(appliedVoucher.remainingBalance, subtotalCarrinho)
totalWithDiscount   = max(0, subtotalCarrinho - voucherDiscount)
saldoRestante       = appliedVoucher.remainingBalance - voucherDiscount
```

- `totalWithDiscount` nunca pode ser negativo — usar `max(0, ...)`.
- Quando `totalWithDiscount = 0`, a etapa de pagamento (004-03) não exige nenhum método de pagamento.

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Não aplicável nesta feature (nenhum endpoint de escrita). As duas chamadas GET são de baixa latência e não requerem virtual threads no lado servidor por conta desta feature.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Não aplicável — feature é exclusivamente de frontend.
- [ ] Dados sensíveis tratados adequadamente? O campo `cpfCnpj` retornado por `GET /customers/search` já vem mascarado pelo backend (`007-03`). O frontend não deve desmascarar nem armazenar o CPF/CNPJ completo no estado local. Apenas `id`, `name` e `phone` são necessários para o payload de `004-04`.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `GET /customers/search` e `GET /vouchers/lookup` permitem `Caixa`, `Gerente` e `Administrador`. O frontend não precisa diferenciar perfis nesta etapa — a proteção é feita pelo backend.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Caixa com carrinho de 1 item digita "Maria" no campo de cliente: verificar que `GET /customers/search?q=Maria` é disparado e a lista de sugestões aparece.
- Caixa seleciona "Maria Silva" da lista: verificar que `selectedCustomer` é preenchido e o campo de voucher é habilitado.
- Caixa informa código de voucher válido pertencente a Maria Silva: verificar que `GET /vouchers/lookup?code={uuid}&customerId={uuid}` é chamado, voucher é aplicado ao estado local, abatimento e novo total são exibidos.
- Voucher com saldo > subtotal: verificar que `voucherDiscount = subtotal`, `totalWithDiscount = 0` e saldo remanescente exibido é `remaining_balance - subtotal`.
- Voucher com saldo <= subtotal: verificar que `voucherDiscount = remaining_balance`, `totalWithDiscount = subtotal - remaining_balance`.
- Caixa aciona "Remover voucher": verificar que `appliedVoucher = null`, `voucherDiscount = 0`, total retorna ao subtotal original.
- Caixa aciona "Desvincular cliente" com voucher aplicado: verificar que `selectedCustomer = null` e `appliedVoucher = null` simultaneamente.

### Casos de erro esperados (respostas do backend)

- `GET /vouchers/lookup` retorna `403` (voucher de outro cliente): verificar exibição de "Este voucher não pertence ao cliente selecionado." sem alterar `appliedVoucher`.
- `GET /vouchers/lookup` retorna `404`: verificar exibição de "Voucher não encontrado." sem alterar estado.
- `GET /vouchers/lookup` retorna `409` (voucher inativo ou saldo zero): verificar exibição de "Voucher indisponível: inativo ou sem saldo." sem alterar estado.
- `GET /customers/search` retorna lista vazia: verificar exibição de "Nenhum cliente encontrado" sem travar o campo.
- `GET /customers/search` retorna `500`: verificar exibição de mensagem de erro genérica e que o carrinho permanece intacto.

### Casos de autorização

- Usuário autenticado como `Catalogador` tenta acessar `/pdv`: deve ser redirecionado antes de chegar nesta etapa (controle feito em `004-00`/`000-03`).
- Sessão expirada durante busca de cliente ou voucher: `401` deve desencadear redirecionamento para login sem perder dados do carrinho (se possível, armazenar estado em `sessionStorage` para recuperação).

### Casos de borda das regras de negócio

- Caixa tenta digitar no campo de voucher sem cliente vinculado: campo deve estar desabilitado — interação impossível.
- Caixa tenta adicionar segundo voucher com um já aplicado: campo deve estar desabilitado — interação impossível.
- Carrinho vazio: campos de cliente e voucher desabilitados — nenhuma chamada de API deve ser disparada.
- Código de voucher com formato não-UUID submetido: o frontend deve validar o formato UUID antes de chamar `GET /vouchers/lookup` e exibir "Código de voucher inválido." localmente.
- `totalWithDiscount = 0` após aplicação do voucher: verificar que a etapa de pagamento (004-03) reconhece `total = 0` e não bloqueia a finalização por falta de pagamento.

---

## Riscos técnicos e dependências

1. **Dependência de `007-03.listar-clientes` (implementação do `GET /customers/search`).** Esta feature só pode ser implementada completamente após `007-03` estar disponível no ambiente de desenvolvimento. O contrato está especificado e é autoritativo; não há risco de divergência se o agente de `007-03` seguir seu tech.md.

2. **Dependência de `005-00.vouchers` (implementação do `GET /vouchers/lookup`).** O contrato está especificado em `005-00/tech.md`. O parâmetro `customerId` (opcional no contrato de `005-00`) é **obrigatório no uso pelo PDV** — o frontend deve sempre enviá-lo quando há cliente vinculado. Se o agente de `005-00` não implementar a validação de `customerId`, a regra de negócio RN5 ("voucher deve pertencer ao cliente vinculado") não será verificada pelo backend durante o lookup.

3. **Divergência de cálculo entre frontend e backend.** O valor `voucherDiscount` é calculado no frontend para exibição provisória. O backend recalcula o mesmo valor em `004-04.finalizar-venda`. Se as lógicas divergirem (ex.: arredondamento diferente), o valor exibido ao Caixa pode diferir do valor persistido. A lógica `min(remainingBalance, subtotal)` deve ser idêntica em ambos os lados.

4. **Ausência de lock otimista no lookup.** Entre o momento em que `GET /vouchers/lookup` retorna `200` e o momento em que `004-04` efetiva o resgate, o saldo do voucher pode ser alterado por outra sessão (ex.: Gerente inativando o voucher manualmente). Isso é tratado em `004-04` com `SELECT ... FOR UPDATE` antes do débito — a mensagem de erro de `004-04` deve ser propagada ao Caixa para que ele refaça o fluxo sem o voucher.

5. **Estado local perdido em recarga de página.** O carrinho e o voucher aplicado são mantidos em memória. Se o Caixa recarregar a página ou a sessão cair, o estado é perdido. Não há mecanismo de recuperação no escopo atual (conforme `004-00`). Isso é um risco operacional conhecido e aceito.
