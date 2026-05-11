# Remover Desconto — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Feature de escrita destrutiva e irreversível sobre o domínio de descontos. Expõe um único endpoint `DELETE /discounts/{id}` que remove o registro em `discount` e, quando `scope = 'book'`, os vínculos em `discount_book` via `ON DELETE CASCADE` já presente no schema.

Não há operação de "desativação" — a única ação disponível é a remoção definitiva. O endpoint é acionado pelo frontend a partir do modal de confirmação na rota `/discounts` (feature `003-02.listar-descontos`), após o usuário confirmar a ação irreversível.

Camadas afetadas:
- Persistência: deleção em `discount` (e, por cascade, `discount_book`)
- Autorização: restrição por perfil (`GERENTE`, `ADMINISTRADOR`) e por filial (`discount.branch_id` deve coincidir com `branchId` do JWT)
- Frontend: modal inline em `/discounts`; sem nova rota

Domínios lidos ou escritos:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Descontos (`003-00`) | `discount` | escrita — DELETE |
| Descontos (`003-00`) | `discount_book` | escrita — DELETE via CASCADE |
| Auth (`000-02`) | claim `branchId` do JWT | leitura — isolamento de filial |

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova ou alteração de schema. As tabelas `discount` e `discount_book` já existem no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Estrutura relevante para o endpoint:

**`discount`**

| Coluna | Tipo PostgreSQL | Nullable | Restrição relevante |
|--------|----------------|----------|---------------------|
| `id` | `UUID` | NOT NULL | PK |
| `branch_id` | `UUID` | NOT NULL | FK → `branch(id)` — usado para verificação de isolamento |
| `scope` | `TEXT` | NOT NULL | `'book'` aciona verificação de cascade em `discount_book` |

**`discount_book`**

| Coluna | Tipo PostgreSQL | Restrição relevante |
|--------|----------------|---------------------|
| `discount_id` | `UUID` | FK → `discount(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | FK → `book(id)` ON DELETE CASCADE |

O `ON DELETE CASCADE` em `discount_book.discount_id` garante que todos os vínculos de livro sejam removidos automaticamente junto com o `discount`. A camada de serviço não precisa executar DELETE explícito em `discount_book`.

### Índices recomendados

O índice para lookup por `discount.id` (PK) já está implícito. Nenhum índice adicional é necessário para esta feature: a operação é sempre por PK e o volume de linhas em `discount_book` por desconto é pequeno.

### Estratégia de migração

Nenhuma migration nova. Rollback não aplicável — nenhuma alteração de schema.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. O `branch_id` de escopo é extraído do claim `branchId` do JWT; o Administrador opera no contexto da filial associada ao seu JWT (não há `branch_id` query param neste endpoint, pois a operação é de remoção pontual).

---

### `DELETE /discounts/{id}`

Remove um desconto da filial. A remoção é definitiva e imediata — o PDV deixa de aplicar o desconto a partir do momento em que a deleção é confirmada.

O isolamento por filial é obrigatório: o backend deve verificar que `discount.branch_id` coincide com o `branchId` do JWT antes de executar o DELETE. Sem essa verificação, um Gerente poderia remover descontos de outra filial fabricando um UUID válido.

- **Authorization:** `GERENTE`, `ADMINISTRADOR`
- **Path param:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `id` | `UUID` | sim | identificador do desconto a ser removido |

- **Request body:** nenhum

- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Desconto removido com sucesso |
  | `401` | Cookie ausente, JWT inválido ou expirado |
  | `403` | Perfil sem permissão (`CATALOGADOR`, `CAIXA`), ou desconto pertence a outra filial |
  | `404` | UUID informado não encontrado em `discount` |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Desconto com `scope = 'book'`: os registros em `discount_book` são removidos automaticamente pelo `ON DELETE CASCADE`. O serviço não precisa de lógica adicional.
  - Desconto com qualquer status (ativo, agendado ou expirado) pode ser removido — não há validação de estado antes da deleção.
  - A verificação de existência (`404`) deve ocorrer antes da verificação de filial (`403`): se o ID não existe na tabela, não é possível determinar a qual filial ele pertenceria.
  - A operação deve ser executada em uma única transação: SELECT para verificar existência e `branch_id`, seguido de DELETE. Não há side effects pós-commit (sem notificações, sem histórico).

## Requisitos de qualidade

- [x] I/O-bound identificado: SELECT de verificação + DELETE em PostgreSQL — candidato a virtual thread (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [x] GraalVM AOT: sem uso de reflexão adicional; a entidade `Discount` já está mapeada em `000-01.modelagem-dados`. Nenhuma configuração AOT extra necessária para este endpoint.
- [x] Dados sensíveis: nenhum campo sensível envolvido. O `id` do desconto é UUID não-sequencial — não expõe enumeração de registros.
- [x] Autorização por perfil coberta: `DELETE /discounts/{id}` restrito a `GERENTE` e `ADMINISTRADOR`. `CATALOGADOR` e `CAIXA` recebem `403`. Isolamento por filial verificado no backend via `discount.branch_id` vs. claim `branchId` do JWT.

## Estratégia de testes

### Fluxo principal (happy path)

- Autenticar como `GERENTE` da filial A; remover desconto com `scope = 'category'` pertencente à filial A; verificar `204` e ausência do registro em `discount`.
- Autenticar como `GERENTE`; remover desconto com `scope = 'book'` que possui vínculos em `discount_book`; verificar `204`, ausência em `discount` e ausência dos vínculos em `discount_book`.
- Autenticar como `ADMINISTRADOR`; remover desconto expirado (`ends_at` no passado); verificar `204` sem mensagem adicional.
- Autenticar como `ADMINISTRADOR`; remover desconto agendado (`starts_at` no futuro); verificar `204`.

### Casos de erro esperados

- `DELETE /discounts/{id}` com UUID inexistente → `404`.
- `DELETE /discounts/{id}` sem cookie `auth_token` → `401`.
- `DELETE /discounts/{id}` com JWT expirado → `401`.

### Casos de autorização

- `CATALOGADOR` autenticado tentando `DELETE /discounts/{id}` → `403`.
- `CAIXA` autenticado tentando `DELETE /discounts/{id}` → `403`.
- `GERENTE` da filial A tentando remover desconto pertencente à filial B (UUID válido e existente) → `403`.
- `ADMINISTRADOR` removendo desconto de qualquer filial → `204` (Administrador não está vinculado a uma filial específica no JWT; a lógica de contexto de filial para Administrador deve ser definida na implementação — ver Riscos).

### Casos de borda das regras de negócio

- Desconto com `scope = 'book'` e múltiplos livros vinculados em `discount_book`; verificar que todos os vínculos são removidos pelo CASCADE sem erro.
- Remover desconto que estava ativo no momento da requisição; confirmar que uma requisição subsequente ao PDV (quando implementado, módulo 004) não mais aplica o desconto — validação de integração futura.

## Riscos técnicos e dependências

1. **Contexto de filial para o Administrador.** O claim `branchId` no JWT do Administrador é `null` (conforme `000-02.autenticacao`). A verificação de isolamento `discount.branch_id = branchId` falharia para `null`. O serviço deve tratar este caso explicitamente: quando `branchId` do JWT for `null` (Administrador), a verificação de filial é ignorada e o DELETE é permitido para qualquer `discount.id` existente. Esta decisão deve ser documentada na implementação.

2. **Dependência de ordenação com 003-01 e 003-02.** Esta feature depende que as tabelas `discount` e `discount_book` existam e estejam populadas (criadas por `003-01`). A listagem que aciona o modal de remoção é fornecida por `003-02`. O endpoint desta feature pode ser implementado independentemente, mas o teste end-to-end requer as features anteriores funcionais.

3. **Impacto no PDV em tempo real (módulo 004).** A remoção é imediata no banco, mas se o PDV (004-xx) mantiver cache de descontos em memória, pode continuar aplicando o desconto removido até a expiração do cache. Esta feature não controla o cache do PDV — a integração deve ser alinhada quando o módulo 004 for especificado. Risco de inconsistência temporária.

4. **Ausência de log de auditoria.** O `business.md` explicita que histórico de descontos removidos está fora de escopo. Portanto, não há registro de quem removeu, quando ou qual era o estado do desconto antes da remoção. Se essa necessidade surgir futuramente (ex.: módulo de relatórios 011), exigirá nova migration e coleta retroativa impossível.
