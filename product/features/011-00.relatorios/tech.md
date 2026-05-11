# Relatórios — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz que define o contexto técnico compartilhado entre as quatro sub-features de relatórios (011-01 a 011-04). Não expõe endpoints próprios nem cria tabelas: todas as queries lêem tabelas já existentes definidas em `000-01.modelagem-dados`. As sub-features acrescentam os contratos de API específicos de cada relatório.

Camadas afetadas: persistência (queries de leitura sobre PostgreSQL 18), serviços de domínio por relatório, e frontend React com hub de navegação em `/relatorios`.

### Tabelas lidas pelo módulo (somente leitura)

| Tabela | Módulo de origem | Uso |
|--------|-----------------|-----|
| `sale` | `000-01` | totais de vendas, período, filial |
| `sale_item` | `000-01` | itens vendidos por livro |
| `sale_payment` | `000-01` | breakdown por método de pagamento |
| `payment_method` | `000-01` | nome do método de pagamento |
| `book` | `000-01` | título, autor, ISBN, categoria, condição, localização |
| `book_stock` | `000-01` | quantidade disponível por filial |
| `voucher` | `000-01` | emissão, saldo, status |
| `voucher_usage` | `000-01` | registros de utilização de voucher |
| `branch` | `000-01` | escopo de filial; nome para exibição |
| `customer` | `000-01` | nome do cliente vinculado ao voucher |

Nenhuma dessas tabelas é escrita por este módulo.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova. Nenhuma alteração de schema. Todas as tabelas utilizadas foram criadas pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

### Índices necessários para performance de relatórios

As queries de relatório fazem varreduras por `branch_id` + intervalo de `sold_at` (ou `issued_at`) com GROUP BY. Os índices abaixo não existem no schema base e devem ser criados em um changeSet dedicado (`003-report-indexes`) para garantir performance adequada:

```sql
-- Relatório de vendas e livros vendidos: filtra sale por filial + período
CREATE INDEX idx_sale_branch_sold_at
    ON sale(branch_id, sold_at DESC);

-- Relatório de vouchers: filtra voucher por filial + data de emissão
CREATE INDEX idx_voucher_branch_issued_at
    ON voucher(branch_id, issued_at DESC);

-- Relatório de estoque baixo: filtra book_stock por filial + condição do livro
-- A query faz JOIN de book_stock com book; o índice em book_stock(branch_id)
-- já é coberto pela UNIQUE(book_id, branch_id), mas o filtro de condição
-- está em book — o índice composto abaixo acelera o JOIN + filtro.
CREATE INDEX idx_book_branch_condition_active
    ON book(branch_id, condition)
    WHERE active = true;
```

> O índice `idx_voucher_branch_active` definido em `005-00.vouchers/tech.md` cobre apenas `voucher(branch_id, active) WHERE active = true`. O relatório de vouchers filtra por `issued_at` (não por `active`), portanto o índice `idx_voucher_branch_issued_at` acima é complementar e necessário.

> Rollback do changeSet `003-report-indexes` é seguro: apenas `DROP INDEX`, sem perda de dados.

### Estratégia de migração

Nenhum dado existente precisa de migração. Os índices são criados em changeSet separado e não alteram estrutura de colunas.

---

## Contratos de API

Este módulo raiz não expõe endpoints próprios. Os contratos de cada relatório são definidos nas sub-features:

| Sub-feature | Endpoint |
|------------|----------|
| `011-01.relatorio-vendas` | `GET /reports/sales` |
| `011-02.relatorio-livros-vendidos` | `GET /reports/books-sold` |
| `011-03.relatorio-estoque-baixo` | `GET /reports/low-stock` |
| `011-04.relatorio-vouchers` | `GET /reports/vouchers` |

### Convenções compartilhadas por todos os endpoints do módulo

**Autorização por perfil e filial:**
- Usuários com perfil `Gerente` têm `branchId` preenchido no JWT; o backend usa esse valor como escopo obrigatório e ignora qualquer `branch_id` enviado via query param.
- Usuários com perfil `Administrador` têm `branchId = null` no JWT; devem obrigatoriamente informar `branch_id` como query param para os relatórios que dependem de período (011-01, 011-02, 011-04). Para 011-03 (estoque baixo), `branch_id` também é obrigatório.
- Perfis `Catalogador` e `Caixa` não têm acesso a nenhum endpoint do módulo (`403`).

**Exportação para Excel (`?format=xlsx`):**
- Todos os endpoints aceitam o query param `format` com valor `xlsx`.
- Quando `format=xlsx`, o backend retorna um arquivo binário com `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` e header `Content-Disposition: attachment; filename="<nome-do-relatorio>.xlsx"`.
- Quando `format` é omitido ou tem valor diferente de `xlsx`, a resposta padrão é JSON.
- A nota do business.md indica que CSV não é suportado — rejeitar `format=csv` com `400`.

> O business.md menciona apenas exportação para Excel (`.xlsx`). O enunciado técnico menciona CSV como opção adicional via `?format=csv|xlsx`, mas o business.md de `011-00` explicitamente exclui CSV do escopo. A decisão final está com o business.md: aceitar apenas `xlsx`; rejeitar `csv` com `400`.

**Validação de período (para 011-01, 011-02, 011-04):**
- `from` e `to` são datas no formato `YYYY-MM-DD` (ISO 8601 local, sem timezone).
- Ambos são obrigatórios.
- `to` deve ser maior ou igual a `from`; caso contrário, `400`.
- O intervalo é fechado em ambas as extremidades: `sold_at >= from::date` e `sold_at < (to::date + interval '1 day')` para capturar todo o dia final.

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Todas as queries de relatório são leituras analíticas com GROUP BY e JOIN — potencialmente longas para períodos grandes; candidatas a virtual threads para não bloquear carrier threads.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Não aplicável a este módulo raiz; cada sub-feature deve avaliar individualmente.
- [ ] Dados sensíveis tratados adequadamente? `customer.cpf_cnpj` não aparece em nenhum dos relatórios; `sale.cashier_id` e `voucher.issued_by` são UUIDs não expostos nas respostas de relatório.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? Sim — ver convenções acima; detalhes em cada sub-feature.

---

## Estratégia de testes

Cenários transversais a ser cobertos em todos os endpoints do módulo:

- Gerente tenta acessar relatório de outra filial via `branch_id` no query param: backend deve ignorar o param e usar o `branchId` do JWT.
- Administrador acessa sem informar `branch_id`: deve retornar `400` (obrigatório para Administrador).
- `Catalogador` tenta acessar qualquer endpoint: deve retornar `403`.
- `Caixa` tenta acessar qualquer endpoint: deve retornar `403`.
- Usuário não autenticado: deve retornar `401`.
- `format=csv` enviado: deve retornar `400`.
- `format=xlsx` enviado com dados disponíveis: deve retornar arquivo binário com header correto.
- Período com `to` anterior a `from`: deve retornar `400`.

---

## Riscos técnicos e dependências

1. **Performance de queries analíticas sem limite de período:** Consultas sem restrição adequada de período sobre `sale` (que pode ter milhões de linhas em produção) podem causar timeout. As sub-features 011-01, 011-02 e 011-04 obrigam `from` e `to`, mitigando o risco. Ainda assim, períodos muito longos (ex.: 5 anos) podem ser lentos sem particionamento de tabela. O risco é baixo no curto prazo.

2. **Dependência de índices do changeSet `003-report-indexes`:** Os endpoints de relatório dependem dos índices definidos neste módulo para performance adequada. Se o changeSet não for aplicado antes do primeiro deploy, as queries funcionarão mas com possível full-scan em tabelas grandes.

3. **Geração de Excel no backend:** A biblioteca de geração de `.xlsx` (ex.: Apache POI) adiciona dependência ao build. O Gradle precisa declarar `implementation 'org.apache.poi:poi-ooxml:...'`. Verificar compatibilidade com Java 25 e GraalVM AOT se necessário.

4. **`business.md` exclui CSV; o enunciado técnico menciona CSV:** Conflito resolvido em favor do `business.md` — somente `.xlsx` é suportado. O agente implementador não deve implementar exportação CSV.
