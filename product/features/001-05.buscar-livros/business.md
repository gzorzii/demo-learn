# Buscar Livros

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que qualquer usuário autenticado pesquise o catálogo da filial por título, autor ou ISBN. Retorna uma lista de resultados com informações relevantes para atendimento ao cliente, verificação de disponibilidade e navegação para o registro completo do livro.

## Atores envolvidos

- **Caixa** — busca livros para verificar disponibilidade e mostrar ao cliente.
- **Catalogador** — busca para conferir registros existentes antes de cadastrar.
- **Gerente** — busca para consulta e gestão.
- **Administrador** — busca no contexto da filial selecionada; pode alternar entre filiais.

## Regras de negócio

1. A busca é realizada no catálogo da filial do usuário autenticado. O Administrador busca na filial atualmente selecionada.
2. Os termos de busca suportados são: título (busca parcial), autor (busca parcial) e ISBN (busca exata ou parcial).
3. A busca retorna apenas livros com `active = true` na filial.
4. Os resultados exibem: título, autor, categoria, condição (novo/usado), preço de venda e quantidade em estoque.
5. Cada resultado é clicável e leva à visualização completa do livro (`/books/:id`).
6. Se a busca não retornar resultados, uma mensagem informativa é exibida.
7. O Administrador pode alternar a filial de busca sem precisar fazer logout; ao trocar de filial, a busca é reexecutada no novo contexto.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado acessa a busca de livros
Quando informa um termo no campo de busca e aciona pesquisar
Então o sistema retorna os livros da filial cujo título, autor ou ISBN contenham o termo informado

Dado que a busca retorna resultados
Quando a lista é exibida
Então cada item mostra: título, autor, categoria, condição, preço de venda e quantidade em estoque

Dado que o usuário clica em um resultado da busca
Quando a ação é executada
Então é redirecionado para /books/:id com o registro completo do livro

Dado que a busca não encontra nenhum livro correspondente
Quando os resultados são exibidos
Então o sistema exibe a mensagem "Nenhum livro encontrado para os termos informados"

Dado que o usuário autenticado possui o perfil Administrador
Quando realiza uma busca
Então a busca é limitada à filial atualmente selecionada pelo Administrador

Dado que o usuário não informa nenhum termo de busca
Quando aciona pesquisar
Então o sistema exibe validação solicitando ao menos um termo de busca
```

## Quem pode acessar

Todos os perfis autenticados (Administrador, Gerente, Catalogador e Caixa).

## Fora de escopo

- Busca em múltiplas filiais simultaneamente.
- Busca em APIs externas de ISBN.
- Filtros avançados (por faixa de preço, por data de cadastro etc.) — cobertos pela listagem `001-03`.
- Busca por clientes ou pedidos.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Busca de livros | `/books/search` | Campo de busca e listagem de resultados por título, autor ou ISBN |

### Diagrama de navegação

```
/ (home) ou menu lateral
  └── /books/search (busca de livros)
        ├── [resultado clicado] → /books/:id (001-04)
        └── [nova busca] → permanece em /books/search com novos resultados
```

### Nota de navegação

A entrada "Buscar Livros" está presente no menu de navegação lateral para todos os perfis: Administrador, Gerente, Catalogador e Caixa. É o único ponto de acesso ao catálogo disponível para o Caixa além da visualização individual.
