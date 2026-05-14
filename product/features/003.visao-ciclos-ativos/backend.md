# Visão CF + PR: Acompanhar Ciclos Ativos do Colaborador — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature implementa um único endpoint de leitura que agrega os ciclos ativos (CF e/ou PR) de um colaborador autenticado. Não introduz novas tabelas nem modifica o schema existente. As camadas tocadas são: controller, service e repository, dentro do domínio `cycle`.

As tabelas lidas são `cycle`, `cycle_subject` e `cycle_evaluator` (já existentes e com Liquibase executado). Nenhuma escrita ocorre — a feature é estritamente somente leitura, conforme a Regra 5 do `business.md`.

A query principal parte de `cycle_subject.subject_user_id = :userId`, filtra registros ativos (sem `deleted_at`, sem `closed_at`), faz join em `cycle` para obter metadados do ciclo e em `cycle_evaluator` para calcular o percentual de respostas. Por se tratar de no máximo 2 registros por usuário (um CF e um PR), a query é simples e de baixo custo — sem necessidade de paginação ou virtual threads.

**Domínios afetados:** `cycle` (leitura de `cycle`, `cycle_subject`, `cycle_evaluator`), `users` (identificação do usuário autenticado via JWT — sem consulta adicional ao banco).

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Esta feature lê exclusivamente tabelas existentes:

- `cycle` — metadados do ciclo (tipo, nome, deadline global de coleta)
- `cycle_subject` — estado individual da sujeita (status, deadline de coleta do subject, data de início)
- `cycle_evaluator` — contagem de avaliadores por status, para cálculo do percentual de respostas

### Índices necessários para esta feature

Os índices abaixo já foram definidos no `data-model.md` (feature 001). Confirmar existência antes de criar migração duplicada:

```sql
-- Já definidos em 001.modelo-de-dados — verificar antes de recriar:
idx_subject_user    ON cycle_subject (subject_user_id)
idx_subject_status  ON cycle_subject (status)
idx_subject_cycle   ON cycle_subject (cycle_id)
idx_evaluator_subject ON cycle_evaluator (cycle_subject_id)
idx_evaluator_status  ON cycle_evaluator (status)
idx_cycle_type      ON cycle (cycle_type)
idx_cycle_status    ON cycle (status)
```

A query de ciclos ativos usa `cycle_subject.subject_user_id` como filtro primário e `cycle_subject.deleted_at IS NULL` + `cycle_subject.closed_at IS NULL` como condições adicionais. O índice `idx_subject_user` é o mais crítico para performance.

### Estratégia de migração

Nenhuma migração necessária. O schema já está aplicado via Liquibase. Rollback não se aplica.

---

## Contratos de API

### `GET /api/me/ciclos/ativos`

Retorna a lista de ciclos ativos do usuário autenticado. O userId é extraído do JWT — sem parâmetro de path ou query para o caso do colaborador. O resultado contém 0, 1 ou 2 itens (no máximo um CF e um PR, conforme Regra 4 do `business.md`).

- **Authorization:** perfis `CIETER` e `PDM` (ambos acessam seus próprios ciclos como colaboradores)

- **Request body:** nenhum

- **Response `200`:**

```json
{
  "cycles": [
    {
      "cycleSubjectId": "uuid",
      "cycleId": "uuid",
      "cycleType": "CF",
      "cycleName": "string | null",
      "currentPhase": "string",
      "collectionDeadline": "ISO-8601 com timezone | null",
      "daysRemaining": 12,
      "responseRate": 0.67,
      "totalEvaluators": 6,
      "respondedEvaluators": 4
    }
  ]
}
```

Campos do objeto dentro de `cycles`:

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `cycleSubjectId` | `UUID` | não | ID do registro `cycle_subject` da sujeita |
| `cycleId` | `UUID` | não | ID do ciclo pai |
| `cycleType` | `"CF"` ou `"PR"` | não | Tipo do ciclo |
| `cycleName` | `string` | sim | Nome do ciclo (presente em PR, nulo em CF) |
| `currentPhase` | `string` | não | Valor de `cycle_subject.status` (ex: `"COLLECTING"`, `"VALIDATING_EVALUATORS"`) |
| `collectionDeadline` | `string` | sim | Prazo final de coleta: usa `cycle_subject.collection_start_at`... ver nota abaixo |
| `daysRemaining` | `integer` | sim | Dias inteiros restantes até `collectionDeadline`; nulo se deadline for nulo |
| `responseRate` | `number` | não | Percentual de respostas: `(RESPONDED + SKIPPED) / total` de `cycle_evaluator`; 0.0 se não houver avaliadores |
| `totalEvaluators` | `integer` | não | Total de `cycle_evaluator` vinculados ao `cycle_subject` (sem filtro de tipo — inclui SELF, PDM, PEER) |
| `respondedEvaluators` | `integer` | não | Quantidade com `status IN ('RESPONDED', 'SKIPPED')` |

**Nota sobre `collectionDeadline`:** a regra de derivação é: usar `cycle_subject.collection_start_at` como marcador de início; o prazo é `cycle_subject.validation_deadline` se existir (campos CF), senão `cycle.collection_deadline`. O campo retornado ao frontend já é o deadline resolvido — a lógica de prioridade fica no serviço, não no cliente.

**Regra de "ativo":** um `cycle_subject` é considerado ativo quando:
- `deleted_at IS NULL`
- `closed_at IS NULL`
- O `cycle` pai tem `status` diferente de `'CLOSED'` e `'CANCELLED'`
- O `cycle` pai tem `deleted_at IS NULL`

Esta regra é aplicada na query do repositório — o serviço não precisa filtrar novamente.

**Cálculo de `daysRemaining`:** `CEIL((collectionDeadline - now()) / 86400)`. Retornar `0` se o deadline já tiver passado (não retornar negativo — deadline vencido é informação de exibição, não erro). Retornar `null` se `collectionDeadline` for nulo.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| `200` | Sucesso; `cycles` pode ser lista vazia `[]` se não houver ciclo ativo |
| `401` | Token ausente, expirado ou inválido |
| `403` | Token válido mas perfil sem permissão (`CALIBRATOR`, `BP`, `ADMIN` sem acumulação de `CIETER` ou `PDM`) |
| `500` | Erro inesperado na query ou no cálculo |

**Edge cases:**

- Nenhum ciclo ativo: retorna `{ "cycles": [] }` com status `200`. Não retornar `404`.
- `cycle_subject` sem nenhum `cycle_evaluator`: `totalEvaluators = 0`, `respondedEvaluators = 0`, `responseRate = 0.0`.
- Deadline nulo (ciclo sem prazo definido): `collectionDeadline = null`, `daysRemaining = null`. O frontend exibe ausência de prazo.
- CF e PR simultâneos para a mesma sujeita são impossíveis pela Regra 4, mas se por inconsistência de dados ocorrerem, retornar ambos — a validação da regra é responsabilidade das features de iniciação, não desta.

---

## Requisitos de qualidade

- [ ] I/O-bound: a query é simples (join de 3 tabelas, máximo 2 linhas retornadas). Virtual threads não são necessários para este endpoint.
- [ ] GraalVM AOT: DTOs de resposta devem ser records Java (sem reflection não declarada). Compatível com AOT.
- [ ] Dados sensíveis: nenhum dado sensível exposto. O userId vem do JWT — não há risco de exposição de dados de terceiros.
- [ ] Autorização: o userId usado na query é sempre extraído do JWT do usuário autenticado (nunca de parâmetro de request). Isso garante que um usuário não possa ver ciclos de outro via este endpoint.

---

## Estratégia de testes

**Happy path:**
- Usuário com perfil `CIETER` e um CF ativo: retorna lista com 1 item, `cycleType = "CF"`, todos os campos preenchidos corretamente.
- Usuário com perfil `PDM` e um PR ativo: retorna lista com 1 item, `cycleType = "PR"`.
- Usuário sem nenhum ciclo ativo: retorna `{ "cycles": [] }` com status `200`.

**Casos de erro esperados:**
- Requisição sem token → `401`.
- Token expirado → `401`.
- Token de perfil `CALIBRATOR` sem acumulação de `CIETER`/`PDM` → `403`.

**Casos de autorização:**
- Verificar que o userId da query é sempre o do token, não de parâmetro externo.
- Verificar que dois usuários diferentes recebem apenas seus próprios ciclos.

**Edge cases de regras de negócio:**
- `cycle_subject` com `collection_start_at IS NULL` e `cycle.collection_deadline` preenchido: `collectionDeadline` deve ser o do ciclo pai.
- `cycle_subject` com `validation_deadline` preenchido (caso CF): `collectionDeadline` deve ser `validation_deadline`, não `cycle.collection_deadline`.
- `cycle_subject` sem nenhum `cycle_evaluator`: `responseRate = 0.0`, sem erro.
- `collectionDeadline` no passado: `daysRemaining = 0`, sem retornar negativo.
- `cycle` com `status = 'CLOSED'`: `cycle_subject` correspondente não deve aparecer na lista.

---

## Riscos técnicos e dependências

- **Semântica de "ativo" depende de `cycle.status`:** os valores do enum `CycleStatus` não estão explicitamente documentados além de `CLOSED` e `CANCELLED` no `business.md`. O agente de implementação deve confirmar com o código existente da entidade `Cycle` quais valores indicam ciclo ativo, para não excluir indevidamente estados intermediários como `COLLECTING` ou `VALIDATING_EVALUATORS`.

- **Campo `collection_deadline` duplicado:** tanto `cycle` quanto `cycle_subject` possuem campos de deadline. A regra de prioridade (subject > ciclo) deve ser implementada consistentemente; uma divergência na lógica poderia exibir prazo incorreto para o usuário.

- **Dependência de features de iniciação:** a visibilidade correta dos ciclos depende que as features 004–007 (iniciar CF) e 016 (iniciar PR) criem `cycle_subject` com os campos `collection_start_at`, `validation_deadline` e `status` corretamente preenchidos. Se esses campos ficarem nulos, o endpoint retorna dados incompletos sem erro — o que pode ser confuso.

- **Rota da visão do PDM para liderado:** a rota `/meu-time/:userId/ciclos` está fora do escopo desta feature. O endpoint equivalente para liderados será especificado na feature de gestão do time como `GET /api/meu-time/{userId}/ciclos/ativos`. **Importante:** esse endpoint futuro deve retornar exatamente o mesmo DTO de `GET /api/me/ciclos/ativos` — o frontend reutiliza o componente `CyclesDashboard` para ambas as rotas, portanto a forma do JSON deve ser idêntica.
