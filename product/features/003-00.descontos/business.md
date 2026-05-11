# Descontos — Módulo 003

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pela gestão de descontos aplicados ao catálogo de livros de uma filial. Permite que o Gerente crie descontos com escopo flexível (livro individual, categoria, autor ou faixa de preço), valor percentual ou fixo, e vigência opcional. Os descontos são consumidos automaticamente pelo PDV (módulo 004) ao escanear um livro, exibindo o preço original e o preço com desconto lado a lado.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `003-01.criar-desconto` | Criar um novo desconto com escopo, valor, tipo e vigência opcional |
| `003-02.listar-descontos` | Listar os descontos configurados na filial, com status de vigência |
| `003-03.remover-desconto` | Remover um desconto existente, encerrando sua aplicação no PDV |

## Atores envolvidos

- **Gerente** — único perfil que cria e remove descontos da própria filial.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Modelo de dados relevante

As tabelas envolvidas estão definidas em `000-01.modelagem-dados`:

- `discount` — registra o desconto com campos: `id`, `branch_id`, `scope` (`book` | `category` | `author` | `price_range`), `value_type` (`percentage` | `fixed`), `value`, `category`, `author`, `min_price`, `max_price`, `starts_at`, `ends_at`, `active`, `created_by`, `created_at`, `updated_at`.
- `discount_book` — associa livros individuais a um desconto de escopo `book`; chave composta `(discount_id, book_id)`.

## Regras de negócio

1. Apenas o Gerente e o Administrador podem criar e remover descontos.
2. O escopo do desconto é definido na criação e não pode ser alterado depois — para mudar, remove e recria.
3. Os escopos possíveis são: livro individual (`book`), categoria (`category`), autor (`author`) e faixa de preço (`price_range`).
4. O valor do desconto pode ser percentual (`percentage`, em %) ou valor fixo (`fixed`, em R$).
5. Um desconto pode ter datas de início e fim opcionais (`starts_at` / `ends_at`). Se não informadas, o desconto é válido enquanto `active = true`.
6. Um livro só pode ter **um** desconto ativo por vez. O sistema impede a criação de um segundo desconto que afete um livro que já possui desconto vigente.
7. Não há edição de desconto — para corrigir ou alterar um desconto, o Gerente deve remover o existente e criar um novo.
8. A remoção de um desconto é imediata: a partir do momento em que é removido, o PDV deixa de aplicá-lo.
9. Descontos com `ends_at` no passado são exibidos como expirados mas não são excluídos automaticamente.

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador. O módulo "Gestão de Descontos" aparece no menu de navegação lateral somente para esses perfis, conforme a tabela de permissões em `000-03.home-navegacao`.

## Fora de escopo

- Edição de um desconto existente (remover e recriar é o fluxo suportado).
- Cupons ou códigos de desconto informados pelo cliente no PDV.
- Descontos automáticos por quantidade (ex.: "leve 3, pague 2").
- Desconto progressivo ou por fidelidade.
- Descontos válidos entre filiais (cada desconto é escopado à filial do Gerente).
- Relatório de impacto financeiro de descontos (pertence ao módulo 011).
