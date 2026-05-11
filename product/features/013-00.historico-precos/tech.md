# Histórico de Preços — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz de auditoria de precificação. Define o contrato da tabela `price_history` e as regras de geração de registros, consumidos pela sub-feature `013-01.consultar-historico-precos`.

Este módulo é **exclusivamente de leitura e referência normativa** para o agente de implementação. A escrita em `price_history` ocorre dentro da transação de `001-02.editar-livro` — este módulo não introduz nenhum endpoint de escrita.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura de `price_history`, `book`, `user`, `branch` |
| API | Endpoints definidos em `013-01.consultar-historico-precos/tech.md` |
| Frontend | Telas definidas em `013-01.consultar-historico-precos/tech.md` |

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria tabelas novas nem altera o schema**. A tabela `price_history` já existe no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### `price_history` — referência normativa

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| `previous_price` | `NUMERIC(10,2)` | NOT NULL | — | preço antes da alteração |
| `new_price` | `NUMERIC(10,2)` | NOT NULL | — | preço após a alteração |
| `changed_by` | `UUID` | NOT NULL | — | FK → `"user"(id)` |
| `changed_at` | `TIMESTAMP` | NOT NULL | `now()` | momento da alteração |

O índice `idx_price_history_book` definido em `000-01.modelagem-dados/tech.md` como `ON price_history(book_id, changed_at DESC)` cobre as consultas por livro com ordenação cronológica decrescente.

Para suportar a consulta geral com filtros por título/autor (que faz JOIN com `book`) e por período (`changed_at`), um índice adicional é necessário:

```sql
-- Suporte a filtro de período no relatório geral (changeSet 003-price-history-indexes)
CREATE INDEX idx_price_history_changed_at ON price_history(changed_at DESC);
```

> O índice `idx_price_history_book` já cobre consultas por `book_id`. O `idx_price_history_changed_at` cobre filtros de período sem book específico. Juntos, são suficientes para as queries do módulo 013.

### Regra de geração — referência normativa

O INSERT em `price_history` é responsabilidade exclusiva de `001-02.editar-livro`. As regras abaixo são reafirmadas aqui para orientação do agente de implementação de `013-01`:

- Um registro é gerado apenas quando `sale_price` do body difere de `book.sale_price` atual (comparação por `BigDecimal.compareTo`, não por `equals`).
- O INSERT precede o UPDATE em `book.sale_price` na mesma transação.
- O campo `changed_by` recebe o `sub` (UUID do usuário) extraído do JWT.
- O campo `changed_at` é definido pelo servidor (`now()`), não pelo cliente.
- Registros em `price_history` são **imutáveis** — nenhum perfil pode editá-los ou excluí-los.

### Estratégia de migração

O changeSet `003-price-history-indexes` deve criar o índice `idx_price_history_changed_at` sem alterar dados existentes. Rollback: `DROP INDEX idx_price_history_changed_at`.

## Contratos de API

Os contratos de API deste módulo estão integralmente definidos em `013-01.consultar-historico-precos/tech.md`. Este documento raiz não os redefine.

## Requisitos de qualidade

- [ ] I/O-bound identificado? Todas as consultas a `price_history` são I/O-bound — candidatas a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT? Records Java para DTOs são compatíveis com AOT sem configuração adicional.
- [ ] Dados sensíveis tratados adequadamente? O campo `changed_by` expõe UUID de usuário nas respostas — não é dado sensível de nível CPF/senha, mas deve ser acompanhado do `name` do usuário (via JOIN) para ser legível. Nenhum dado de CPF, CNPJ, senha ou token é envolvido.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `Catalogador` e `Caixa` não têm acesso a nenhum endpoint deste módulo. Detalhes em `013-01/tech.md`.

## Estratégia de testes

Cenários de teste estão em `013-01.consultar-historico-precos/tech.md`. Este módulo raiz não adiciona cenários além dos especificados lá.

A regra de geração do registro em `price_history` é testada em `001-02.editar-livro/tech.md` (item "Editar `sale_price` e verificar entrada em `price_history`").

## Riscos técnicos e dependências

1. **Dependência estrita de `001-02.editar-livro`.** Todo o conteúdo da tabela `price_history` depende de `PUT /books/{id}` ter sido implementado corretamente — incluindo a regra de comparação de preço com `BigDecimal.compareTo`. Se a geração de registros falhar silenciosamente em `001-02`, as telas de `013-01` exibirão histórico incompleto. Não há mecanismo de recuperação post-hoc — os dados perdidos são permanentemente ausentes.

2. **Ausência de índice de texto completo para filtros por título/autor.** A busca por título e autor no relatório geral (`013-01`) usa JOIN com `book` e filtro `ILIKE '%termo%'`. Os índices B-tree em `book(title)` e `book(author)` (de `000-01`) não cobrem `ILIKE` com wildcard prefixado. Para volume alto, considerar `GIN + pg_trgm` em iteração futura — mesmo risco documentado em `001-00.catalogo-livros/tech.md`.

3. **Nenhum risco adicional identificado.** O módulo é somente leitura; não há operações de escrita, concorrência ou rollback complexo a gerenciar além do que já está especificado em `001-02`.
