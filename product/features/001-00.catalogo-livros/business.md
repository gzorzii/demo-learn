# Catálogo de Livros — Módulo 001

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo central do sistema. Agrupa todas as operações sobre o catálogo de livros de uma filial: cadastro, edição, listagem, visualização, busca e gerenciamento de imagens. Permite que Catalogadores e Gerentes mantenham o acervo atualizado, com controle de condição, preço de venda, localização física e imagens para exibição ao cliente.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `001-01.cadastrar-livro` | Registrar novo livro (novo ou usado) com todos os metadados, preço e lote de origem opcional |
| `001-02.editar-livro` | Alterar dados de um livro existente; toda alteração de preço gera histórico automaticamente |
| `001-03.listar-livros` | Listar o catálogo da filial com filtros e seleção para impressão de etiquetas |
| `001-04.visualizar-livro` | Exibir o registro completo de um livro, incluindo imagens e localização na prateleira |
| `001-05.buscar-livros` | Buscar livros por título, autor ou ISBN no catálogo da filial |
| `001-06.gerenciar-imagens-livro` | Adicionar, reordenar e remover imagens de um livro (máx. 10) |

## Atores envolvidos

- **Catalogador** — cadastra e edita livros; gerencia imagens.
- **Gerente** — cadastra e edita livros; define o preço de venda; avalia condição de usados.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.
- **Caixa** — acesso somente leitura (busca e visualização).

## Regras de negócio

1. Livros novos e usados compartilham a mesma estrutura de registro, diferenciando-se pelo campo `condition`.
2. O campo `condition_description` é obrigatório para livros usados e registra avarias visíveis.
3. Livros novos controlam estoque por quantidade; cada livro usado possui registro individual.
4. Ao informar um ISBN no cadastro, o sistema busca registros existentes com aquele ISBN e pré-preenche os campos base (título, autor, editora, ano, categoria) — mas sempre cria um novo registro independente.
5. O preço de venda é definido manualmente pelo Gerente.
6. Toda alteração no preço de venda é registrada automaticamente em histórico de preços (timestamp, preço anterior, novo preço, usuário responsável).
7. Cada livro pode ter até 10 imagens.
8. O estoque é escopado por filial; não há compartilhamento entre filiais.
9. Um livro pode opcionalmente ser vinculado a um lote de compra de usados (`used_book_purchase`), desde que esse lote já exista no sistema.

## Quem pode acessar

Administrador, Gerente e Catalogador têm acesso completo ao módulo. Caixa tem acesso apenas às telas de busca e visualização. Todas as operações exigem autenticação válida (JWT via cookie).

## Fora de escopo

- Gestão de estoque entre filiais (transferências).
- Importação em lote de livros via arquivo.
- Integração com API externa de busca por ISBN.
- Devoluções ou remoção definitiva de registro de venda já concluída.
- Emissão de NF-e ou documentos fiscais.
