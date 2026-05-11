# Selecionar Pagamento no PDV — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature da tela `/pdv` responsável pela etapa de seleção e distribuição de valores de pagamento antes da finalização da venda. Não introduz nenhum endpoint novo no backend — todo o comportamento é implementado como lógica de estado local no frontend React, com base nos dados do carrinho (004-01), do voucher opcional (004-02) e na lista de métodos ativos retornada por `GET /payment-methods` (008-00/008-01).

O estado de pagamento gerenciado nesta etapa é transitório: existe apenas no estado React da tela `/pdv` e é consumido integralmente pela feature de finalização (004-04), que é a única responsável por persistir os registros em `sale_payment`.

Camadas afetadas: exclusivamente frontend React. Nenhuma migration, nenhum endpoint, nenhuma entidade JPA nova.

Domínios externos consumidos por esta sub-feature:

| Domínio | Contrato consumido | Direção |
|---------|-------------------|---------|
| Métodos de Pagamento (`008-00`) | `GET /payment-methods?activeOnly=true` | leitura — lista de métodos disponíveis para a filial |
| PDV — Carrinho (`004-01`) | estado local: `subtotal`, itens | leitura — base para cálculo do `total` antes do voucher |
| PDV — Voucher (`004-02`) | estado local: `voucher_amount_used` | leitura — abatimento que reduz o valor a cobrir |
| PDV — Finalização (`004-04`) | estado local: lista de `{ payment_method_id, amount }` | fornecimento — dados persistidos no momento da finalização |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova é criada por esta sub-feature. A tabela `sale_payment` já está definida em `004-00.pdv/business.md` e será criada na migration do módulo PDV. Esta sub-feature apenas popula o estado local que será gravado em `sale_payment` pela feature 004-04.

#### `sale_payment` — referência (definida em 004-00, gravada em 004-04)

| Coluna | Tipo PostgreSQL | Nullable | Restrições |
|--------|----------------|----------|------------|
| `id` | `UUID` | NOT NULL | PK, `uuidv7()` |
| `sale_id` | `UUID` | NOT NULL | FK → `sale(id)` |
| `payment_method_id` | `UUID` | NOT NULL | FK → `payment_method(id)` |
| `amount` | `NUMERIC(10,2)` | NOT NULL | valor pago neste método; deve ser > 0 |

### Estratégia de migração

Nenhuma migração é emitida por esta sub-feature. A criação de `sale_payment` é responsabilidade do módulo `004-00.pdv`.

---

## Contratos de API

### Endpoint consumido: `GET /payment-methods`

Esta sub-feature não define endpoints. O único contrato de backend relevante é o endpoint já especificado em `008-00.metodos-pagamento/tech.md`, consumido pelo frontend para popular o seletor de métodos.

- **Contrato completo:** ver `008-00.metodos-pagamento/tech.md`
- **Chamada esperada pelo PDV:** `GET /payment-methods` (sem parâmetro → `activeOnly=true` implícito)
- **Authorization:** `Caixa`, `Gerente`, `Administrador` — todos os perfis que operam o PDV têm acesso
- **Response `200`:** array de `PaymentMethodResponse`; pode ser `[]` se nenhum método estiver ativo

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

- **Quando chamar:** ao entrar na etapa de pagamento na tela `/pdv`; pode ser chamado na abertura da tela e mantido em cache local durante a sessão de venda, recarregando apenas se o usuário navegar para fora e retornar.

---

## Lógica de estado local (frontend)

> Esta seção descreve o contrato de dados que o estado React deve manter. Não prescreve implementação — apenas define os campos, tipos e invariantes que o agente de desenvolvimento deve respeitar.

### Estrutura do estado de pagamento

```typescript
type PaymentEntry = {
  paymentMethodId: string;   // UUID de payment_method.id
  paymentMethodName: string; // nome exibido ao usuário (desnormalizado para UX)
  amount: number;            // valor informado pelo Caixa; deve ser > 0
};

type PaymentState = {
  entries: PaymentEntry[];   // lista provisória de métodos e valores
};
```

### Valores derivados (calculados, não armazenados)

| Valor derivado | Fórmula | Observações |
|----------------|---------|-------------|
| `total_a_cobrir` | `sale.subtotal - voucher_amount_used` | Quando `total = 0`, etapa pode ser ignorada |
| `valor_coberto` | `sum(entries[i].amount)` | Soma em tempo real dos valores informados |
| `valor_restante` | `total_a_cobrir - valor_coberto` | Exibido ao usuário enquanto `> 0` |
| `pagamento_valido` | `total_a_cobrir == 0 OR valor_coberto >= total_a_cobrir` | Controla habilitação do botão "Finalizar venda" |

### Invariantes do estado — validações frontend

As seguintes regras devem ser verificadas no frontend antes de habilitar o avanço para 004-04. Estas validações são locais (sem chamada ao backend):

| Regra de negócio | Validação correspondente | Mensagem ao usuário |
|-----------------|--------------------------|---------------------|
| RN-4: soma dos valores >= total | `valor_coberto >= total_a_cobrir` | "Valor restante a cobrir: R$ X,XX" |
| RN-5: nenhum método com valor <= 0 | `entry.amount > 0` para cada entrada | "O valor informado deve ser maior que zero" |
| RN-8: total = R$ 0,00 → etapa ignorável | `total_a_cobrir == 0` → `pagamento_valido = true` sem entradas | nenhuma mensagem de erro |
| RN-2: mínimo 1 método quando total > 0 | implícito em RN-4: `valor_coberto >= total_a_cobrir > 0` exige ao menos uma entrada com `amount > 0` | coberto pelo aviso de valor restante |
| Método duplicado na lista | impedir adição do mesmo `paymentMethodId` duas vezes | "Este método de pagamento já foi adicionado" |

> A regra RN-4 é `>=` e não `==`: o sistema não exige que o valor informado seja exatamente o total (não há cálculo de troco — ver "Fora de escopo" em `business.md`). O excedente é admitido e tratado fisicamente no caixa.

### Dados fornecidos para 004-04

Ao acionar "Finalizar venda", o estado de pagamento transfere para a feature 004-04 a lista de entradas no formato:

```typescript
type SalePaymentInput = {
  paymentMethodId: string;
  amount: number; // NUMERIC(10,2) — truncar casas decimais além de 2 antes de enviar
};
```

A feature 004-04 é a única responsável por persistir esses dados em `sale_payment`.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? A única operação I/O desta sub-feature é `GET /payment-methods`, já especificada como candidata a virtual thread em `008-00`. Nenhuma operação I/O nova introduzida.
- [ ] GraalVM AOT: sem componentes novos de backend; não aplicável a esta sub-feature.
- [ ] Dados sensíveis: nenhum dado sensível (CPF, CNPJ, senha, token) é manipulado nesta etapa.
- [ ] Autorização por perfil: o acesso à tela `/pdv` já é protegido por `RoleRoute` com `MODULE_PERMISSIONS['pdv']` (`Administrador`, `Gerente`, `Caixa`), conforme `000-03.home-navegacao/tech.md`. Nenhuma verificação adicional necessária para esta etapa específica.
- [ ] Precisão monetária: valores `amount` devem ser tratados como `NUMERIC(10,2)` — o frontend deve truncar/arredondar para 2 casas decimais antes de calcular `valor_coberto` e antes de enviar para 004-04, evitando erro de arredondamento acumulado em float.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Venda com total R$ 50,00 e sem voucher: selecionar "Dinheiro" com valor R$ 50,00 → `pagamento_valido = true`; botão "Finalizar venda" habilitado.
- Venda com total R$ 80,00: selecionar "Cartão de Crédito" com R$ 30,00 e "Dinheiro" com R$ 50,00 (split) → `valor_coberto = 80,00`, `valor_restante = 0` → botão habilitado.
- Venda com total R$ 60,00 e voucher de R$ 20,00: `total_a_cobrir = 40,00`; selecionar "PIX" com R$ 40,00 → `pagamento_valido = true`.
- Venda com total R$ 0,00 (voucher cobre tudo): etapa de pagamento sem nenhuma entrada → `pagamento_valido = true`; botão habilitado diretamente.
- `GET /payment-methods` retorna dois métodos ativos → lista exibida com dois itens selecionáveis.

**Casos de erro esperados (validação local)**
- Informar valor R$ 0,00 em um método: mensagem de validação inline; botão permanece bloqueado.
- Informar valor negativo: mesma validação.
- Soma de valores menor que o total: exibir valor restante; botão bloqueado.
- Tentar adicionar o mesmo método duas vezes: exibir mensagem "método já adicionado"; segunda entrada rejeitada.
- Remover método único quando total > 0: `valor_coberto = 0`, `valor_restante = total_a_cobrir`; botão bloqueado.

**Casos de autorização**
- `Catalogador` não acessa `/pdv` → bloqueado por `RoleRoute` antes mesmo desta etapa.
- Sem cookie `auth_token`: `GET /payment-methods` retorna `401`; frontend redireciona para `/login` (comportamento padrão do interceptor, herdado de `000-02`).
- `Caixa` autenticado: `GET /payment-methods` sem `activeOnly=false` → `200` com métodos ativos; comportamento correto.

**Edge cases de regras de negócio**
- `GET /payment-methods` retorna lista vazia (nenhum método ativo na filial): etapa de pagamento exibe mensagem informativa "Nenhum método de pagamento disponível"; se `total_a_cobrir > 0`, botão "Finalizar venda" permanece desabilitado.
- Venda com `total_a_cobrir = 0,01` (centavo residual após voucher): deve exigir ao menos um método com `amount >= 0,01`; `total_a_cobrir == 0` só se aplica quando exatamente zero.
- Caixa informa R$ 100,00 em método para uma venda de R$ 60,00 (valor excedente): aceito (`valor_coberto >= total_a_cobrir`); nenhum aviso de erro — troco é tratado fisicamente fora do sistema.

---

## Riscos técnicos e dependências

1. **Dependência de 008-00 já implementado:** A etapa de pagamento é inoperante se `GET /payment-methods` não estiver disponível. Ordem recomendada de implementação: `008-00` e `008-01` antes de qualquer sub-feature do módulo `004`. Risco atual: ambos os tech.md já existem; dependência está documentada e resolvível.

2. **Dependência do estado compartilhado do PDV:** Esta sub-feature lê `subtotal` e `voucher_amount_used` do estado local gerenciado pelas features `004-01` e `004-02` respectivamente. Se o estado global do PDV não for implementado com uma estrutura compartilhada entre as quatro sub-features (004-01 a 004-04), cada sub-feature pode gerenciar estado isolado e a composição ficará inconsistente. O estado do PDV deve ser centralizado em um único store ou contexto React antes de implementar qualquer das sub-features.

3. **Precisão de ponto flutuante no cálculo de `valor_restante`:** Operações aritméticas com `number` JavaScript sobre valores monetários podem acumular erros de arredondamento (ex.: `0.1 + 0.2 !== 0.3`). O frontend deve trabalhar com inteiros em centavos internamente e converter para exibição, ou usar uma biblioteca de precisão decimal, especialmente para o cálculo de `valor_restante` exibido em tempo real.

4. **Sem sincronização de métodos durante a venda:** A lista de métodos é carregada ao entrar na etapa de pagamento e não é recarregada automaticamente durante a venda. Se o Gerente desativar um método enquanto uma venda está em andamento naquele PDV, o método continuará visível até a tela ser recarregada. O impacto é baixo (o método desativado ainda tem `id` válido em `payment_method`; a FK em `sale_payment` não é violada), mas a feature 004-04 pode considerar uma validação server-side ao persistir.
