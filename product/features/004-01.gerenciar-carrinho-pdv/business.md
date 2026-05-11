# Gerenciar Carrinho no PDV

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Caixa montar o carrinho de uma venda no PDV adicionando livros por leitura de código de barras (scanner) ou por busca manual por título/ISBN, e remover itens antes de finalizar. Para cada item adicionado, o sistema exibe o preço original e o preço efetivo com desconto ativo (módulo 003-xx), quando houver. Esta é a primeira etapa obrigatória de qualquer venda — sem itens no carrinho não é possível avançar para pagamento ou finalização.

## Atores envolvidos

- **Caixa** — monta o carrinho na própria filial.
- **Gerente** — pode operar o PDV e montar carrinhos na própria filial.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. O carrinho é estado local do frontend — nenhum registro é criado no banco durante a montagem.
2. O Caixa pode adicionar livros de duas formas: leitura de código de barras via scanner (input de ISBN) ou busca manual por título ou ISBN dentro da filial.
3. Ao adicionar um livro, o sistema verifica imediatamente se existe desconto ativo para aquele livro na filial; em caso positivo, exibe preço original e preço com desconto lado a lado.
4. Um livro sem estoque disponível (`quantity <= 0` para novos; registro sem `available = true` para usados) não pode ser adicionado ao carrinho — o sistema exibe mensagem de indisponibilidade.
5. O mesmo livro (mesmo `book_id`) pode ser adicionado apenas uma vez ao carrinho — não há quantidade por item, pois cada livro é um registro individual.
6. O Caixa pode remover qualquer item do carrinho a qualquer momento antes da finalização.
7. O carrinho exibe um resumo com: lista de itens (título, preço original, preço efetivo), subtotal e total provisório (sem voucher ainda).
8. O carrinho deve ter ao menos um item para que o Caixa possa avançar para as etapas de voucher, pagamento e finalização.
9. A verificação de desconto ativo considera apenas descontos com `active = true` e dentro do período de vigência (`starts_at` / `ends_at`) no momento da adição.
10. O preço capturado no momento da adição ao carrinho é o preço de venda vigente do livro (`book.price`) — flutuações posteriores de preço não afetam o carrinho já montado.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Caixa, Gerente ou Administrador
Quando acessa /pdv
Então a tela de PDV é exibida com carrinho vazio e campo de entrada para código de barras

Dado que o Caixa escaneia um ISBN válido de um livro com estoque disponível e sem desconto ativo
Quando o código é lido pelo campo de entrada
Então o livro é adicionado ao carrinho
E exibe título e preço de venda sem desconto
E atualiza o subtotal do carrinho

Dado que o Caixa escaneia um ISBN válido de um livro com desconto ativo vigente
Quando o código é lido pelo campo de entrada
Então o livro é adicionado ao carrinho
E exibe o preço original e o preço com desconto lado a lado
E o subtotal usa o preço efetivo com desconto

Dado que o Caixa escaneia um ISBN de um livro sem estoque disponível
Quando o código é lido pelo campo de entrada
Então o sistema exibe mensagem de erro informando que o livro está indisponível
E o item não é adicionado ao carrinho

Dado que o Caixa escaneia um ISBN já presente no carrinho
Quando o código é lido pelo campo de entrada
Então o sistema exibe mensagem informando que o livro já está no carrinho
E o item não é duplicado

Dado que o Caixa utiliza a busca manual por título ou ISBN
Quando digita um termo e seleciona um livro disponível nos resultados
Então o livro é adicionado ao carrinho com as mesmas regras de desconto e disponibilidade

Dado que o carrinho possui pelo menos um item
Quando o Caixa aciona "Remover" em um item
Então o item é removido do carrinho
E o subtotal é atualizado

Dado que o carrinho está vazio
Quando o Caixa tenta avançar para pagamento
Então o sistema bloqueia a ação e exibe mensagem informando que o carrinho precisa ter ao menos um item
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Caixa**, **Gerente** ou **Administrador**. A rota `/pdv` é protegida e redireciona perfis sem permissão. Conforme `000-03.home-navegacao`, o módulo "PDV / Vendas" é visível para Caixa, Gerente e Administrador.

## Fora de escopo

- Quantidade de itens por livro (cada livro é unitário — um registro = um item no carrinho).
- Persistência do carrinho entre sessões ou recarregamentos de página.
- Adição de itens de outras filiais.
- Desconto manual informado pelo Caixa (apenas descontos configurados pelo Gerente via módulo 003-xx).
- Cálculo de troco.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Tela principal do PDV | `/pdv` | Ponto de entrada do PDV; exibe carrinho, campo de scanner, busca manual e resumo de totais |

### Diagrama de navegação

```
/ (home)
  └── /pdv (tela principal do PDV — carrinho)
        ├── [scanner / busca] → item adicionado (inline, mesma tela)
        │     ├── [livro disponível] → item aparece no carrinho com preço(s)
        │     └── [livro indisponível / já no carrinho] → mensagem de erro inline
        ├── [remover item] → item removido, subtotal atualizado (inline)
        └── [carrinho com >= 1 item] → avança para etapa de voucher/pagamento (004-02 e 004-03)
```

### Nota de navegação

O PDV é acessado pelo item "PDV / Vendas" no menu de navegação lateral, visível para **Caixa**, **Gerente** e **Administrador**, conforme `000-03.home-navegacao`. O fluxo do PDV é uma sequência de etapas na mesma tela (`/pdv`) — não gera novas rotas para cada etapa.
