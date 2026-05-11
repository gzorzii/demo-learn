# Editar Livro

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Catalogadores e Gerentes alterem os dados de um livro já cadastrado. Toda alteração no preço de venda é registrada automaticamente no histórico de preços, preservando o rastreio de mudanças de precificação.

## Atores envolvidos

- **Catalogador** — altera metadados do livro (título, autor, categoria, localização etc.).
- **Gerente** — altera qualquer campo, incluindo o preço de venda.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Somente livros pertencentes à filial do usuário autenticado podem ser editados.
2. Todos os campos editáveis do cadastro original estão disponíveis para alteração, exceto `registered_at` (imutável) e `condition` (a condição do livro não pode ser alterada após o cadastro).
3. Toda alteração no campo `sale_price` deve gerar automaticamente um registro em `price_history` com: timestamp da alteração, preço anterior, novo preço e ID do usuário que realizou a mudança. Esse registro é criado antes da atualização do preço no livro.
4. O campo `condition_description` permanece obrigatório para livros usados.
5. A quantidade em estoque de livros novos pode ser ajustada na edição.
6. O campo `lot_id` não é editável após o cadastro inicial — o vínculo com o lote é definitivo.
7. Alterações em outros campos (que não o preço) não geram registros em `price_history`.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Catalogador, Gerente ou Administrador
E existe um livro cadastrado na filial
Quando acessa a tela de edição do livro
Então o formulário exibe os dados atuais preenchidos nos campos editáveis

Dado que o usuário altera o preço de venda de R$30,00 para R$25,00
Quando aciona "Salvar"
Então o sistema cria um registro em price_history com previous_price = 30.00, new_price = 25.00, changed_by = ID do usuário e changed_at = timestamp atual
E atualiza sale_price do livro para 25.00

Dado que o usuário altera apenas o campo "localização na prateleira"
Quando aciona "Salvar"
Então o sistema salva a alteração
E nenhum registro é criado em price_history

Dado que o usuário tenta salvar o formulário de um livro usado sem preencher condition_description
Quando aciona "Salvar"
Então o sistema exibe erro de validação no campo condition_description
E não salva a alteração

Dado que o usuário aciona "Cancelar" sem salvar
Quando confirma o cancelamento
Então é redirecionado de volta para a visualização do livro sem alterações salvas

Dado que o usuário tenta editar um livro de outra filial
Quando tenta acessar a rota de edição
Então o sistema nega o acesso e exibe mensagem de erro de permissão
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador, Gerente ou Catalogador, restritos à própria filial (exceto Administrador, que opera pela filial selecionada).

## Fora de escopo

- Alteração da condição do livro (`new`/`used`) após o cadastro.
- Alteração do lote de origem (`lot_id`) após o cadastro.
- Alteração do campo `registered_at`.
- Gerenciamento de imagens — coberto por `001-06.gerenciar-imagens-livro`.
- Visualização do histórico de preços — coberta por `013-01.consultar-historico-precos`.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de edição de livro | `/books/:id/edit` | Alterar dados de um livro existente |

### Diagrama de navegação

```
/books/:id (visualização do livro)
  └── /books/:id/edit (formulário de edição)
        ├── [salvar com sucesso] → /books/:id (visualização do livro editado)
        ├── [cancelar] → /books/:id (visualização do livro sem alterações)
        └── [erro de validação] → permanece em /books/:id/edit com mensagens de erro
```

### Nota de navegação

O acesso à edição ocorre pelo botão "Editar" presente na tela de visualização do livro (`/books/:id`). A entrada no menu de navegação é a mesma do módulo — "Catálogo de Livros" — visível para Administrador, Gerente e Catalogador.
