# Gerenciar Imagens do Livro

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que qualquer usuário autenticado adicione, reordene e remova imagens de um livro existente. As imagens são utilizadas para mostrar o estado físico do livro ao cliente durante o atendimento.

## Atores envolvidos

- **Qualquer perfil autenticado** (Administrador, Gerente, Catalogador, Caixa) — todos podem adicionar ou remover imagens de um livro da própria filial.

## Regras de negócio

1. Cada livro pode ter no máximo 10 imagens. Tentativas de adicionar uma 11ª imagem são rejeitadas com mensagem de erro.
2. O usuário pode fazer upload de uma ou mais imagens por vez, desde que o limite total de 10 não seja ultrapassado.
3. As imagens são exibidas em ordem definida por `book_image.order`. O usuário pode reordenar as imagens (ex.: arrastar e soltar ou botões de mover).
4. Qualquer imagem pode ser removida individualmente, com confirmação antes da exclusão.
5. O sistema aceita formatos de imagem comuns (JPEG, PNG, WebP).
6. Somente imagens de livros da filial do usuário autenticado podem ser gerenciadas (exceto Administrador, que opera pela filial selecionada).

## Critérios de aceite

```gherkin
Dado que o usuário autenticado acessa /books/:id/images
E o livro pertence à filial do usuário
Quando a tela é exibida
Então o sistema exibe as imagens existentes na ordem definida por book_image.order
E exibe um controle para adicionar novas imagens

Dado que o livro possui menos de 10 imagens
Quando o usuário faz upload de uma nova imagem
Então a imagem é salva e exibida ao final da galeria

Dado que o livro já possui 10 imagens
Quando o usuário tenta fazer upload de mais uma imagem
Então o sistema rejeita a operação e exibe mensagem "Limite de 10 imagens atingido"

Dado que o usuário reordena as imagens
Quando a nova ordem é confirmada
Então o sistema atualiza book_image.order com a nova sequência

Dado que o usuário aciona "Remover" em uma imagem
Quando confirma a exclusão
Então a imagem é removida do livro
E a galeria é atualizada

Dado que o usuário acessa /books/:id/images de um livro de outra filial
Quando a requisição é processada
Então o sistema nega o acesso com mensagem de erro de permissão
```

## Quem pode acessar

Todos os perfis autenticados (Administrador, Gerente, Catalogador e Caixa), restritos à própria filial (exceto Administrador).

## Fora de escopo

- Edição ou recorte de imagens (crop, resize) dentro do sistema.
- Definição de imagem de capa separada (a ordem define qual imagem é exibida primeiro).
- Upload de imagens durante o cadastro inicial do livro — o cadastro (`001-01`) não inclui upload; as imagens são adicionadas após o cadastro via esta feature.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Gerenciamento de imagens | `/books/:id/images` | Visualizar, adicionar, reordenar e remover imagens de um livro |

### Diagrama de navegação

```
/books/:id (visualização do livro)
  └── /books/:id/images (gerenciamento de imagens)
        ├── [upload de imagem] → permanece em /books/:id/images com galeria atualizada
        ├── [reordenar imagens] → permanece em /books/:id/images com nova ordem
        ├── [remover imagem] → permanece em /books/:id/images com galeria atualizada
        └── [Voltar] → /books/:id (visualização do livro)
```

### Nota de navegação

Acessado exclusivamente pelo botão "Gerenciar Imagens" na tela de visualização do livro (`/books/:id`). Não possui entrada direta no menu de navegação lateral. Disponível para todos os perfis autenticados.
