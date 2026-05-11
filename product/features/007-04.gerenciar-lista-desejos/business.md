# Gerenciar Lista de Desejos

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente adicionar e remover itens da lista de desejos de um cliente. Cada item representa um livro que o cliente deseja adquirir mas que não está disponível em estoque no momento. Quando um livro correspondente for cadastrado no catálogo (feature `001-01.cadastrar-livro`), o sistema disparará automaticamente uma notificação in-app para os Gerentes e Caixas da filial — essa geração de notificação é responsabilidade exclusiva do módulo 014-01 e está fora do escopo desta feature.

## Atores envolvidos

- **Gerente** — adiciona e remove itens da lista de desejos de clientes da própria filial.
- **Administrador** — realiza as mesmas operações no contexto da filial selecionada.

## Regras de negócio

1. A lista de desejos é acessada sempre no contexto de um cliente específico — não existe uma lista global de desejos.
2. Para adicionar um item, o Gerente informa pelo menos o título do livro desejado. Autor e ISBN são opcionais.
3. Um cliente pode ter múltiplos itens na lista de desejos, sem limite definido.
4. Não é possível adicionar dois itens idênticos (mesmo título e mesmo ISBN) para o mesmo cliente; se o ISBN for informado, ele serve como identificador de unicidade; se não houver ISBN, o título é o critério de unicidade.
5. Itens com `notified = true` indicam que a notificação de chegada já foi disparada; esses itens permanecem na lista de forma informativa e podem ser removidos pelo Gerente manualmente.
6. A remoção de um item da lista de desejos é permanente e não pode ser desfeita.
7. A lista exibe, para cada item: título, autor (se informado), ISBN (se informado) e indicação de se já foi notificado (`notified`).
8. A lista de desejos pertence à filial; o campo `branch_id` do item é a filial do Gerente autenticado no momento do cadastro do item.

## Critérios de aceite

```gherkin
Funcionalidade: Gerenciar lista de desejos do cliente

  Cenário: Adicionar item com título obrigatório
    Dado que o usuário autenticado possui perfil "Gerente"
    E acessa a lista de desejos do cliente "Ana Souza"
    Quando preenche "título = O Alquimista" e não informa autor nem ISBN
    E confirma a adição
    Então um registro é criado em "customer_wishlist" com "title = O Alquimista", "notified = false"
    E o item aparece na lista de desejos de "Ana Souza"

  Cenário: Adicionar item com todos os campos
    Dado que o Gerente está na lista de desejos de um cliente
    Quando preenche "título = Dom Casmurro", "autor = Machado de Assis", "isbn = 9788535914849"
    E confirma a adição
    Então o item é criado com os três campos preenchidos
    E aparece na lista de desejos do cliente

  Cenário: Tentativa de adicionar item sem título
    Dado que o Gerente está no formulário de adição de item da lista de desejos
    Quando não preenche o campo "título" e tenta confirmar
    Então o sistema exibe erro de validação "Título é obrigatório"
    E o item não é criado

  Cenário: Tentativa de adicionar item duplicado por ISBN
    Dado que o cliente "Ana Souza" já possui "isbn = 9788535914849" na lista de desejos
    Quando o Gerente tenta adicionar outro item com o mesmo ISBN
    E confirma
    Então o sistema exibe erro "Este livro já está na lista de desejos do cliente"
    E o item não é criado

  Cenário: Remover item da lista de desejos
    Dado que "Ana Souza" possui o item "O Alquimista" na lista de desejos
    Quando o Gerente clica em "Remover" no item
    E confirma a remoção
    Então o registro é excluído de "customer_wishlist"
    E o item não aparece mais na lista de desejos de "Ana Souza"

  Cenário: Visualizar itens já notificados
    Dado que o item "Dom Casmurro" da lista de "Ana Souza" possui "notified = true"
    Quando o Gerente acessa a lista de desejos de "Ana Souza"
    Então o item aparece com indicação visual de "já notificado"
    E permanece disponível para remoção manual

  Cenário: Perfil sem permissão não acessa a lista de desejos
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    Quando tenta acessar a rota "/clientes/:id/lista-desejos"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/clientes/:id/lista-desejos` é protegida; perfis sem permissão são redirecionados.

## Fora de escopo

- Geração da notificação in-app quando um livro desejado chega ao estoque (responsabilidade do módulo 014-01).
- Notificação direta ao cliente por e-mail, SMS ou WhatsApp.
- Limite máximo de itens na lista de desejos por cliente.
- Busca automática no catálogo ao adicionar um item (o item é registrado como intenção de desejo, não como busca de estoque).
- Histórico de itens removidos da lista de desejos.
- Exportação da lista de desejos.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Lista de desejos do cliente | `/clientes/:id/lista-desejos` | Visualizar, adicionar e remover itens da lista de desejos de um cliente específico |

### Diagrama de navegação

```
/clientes (listagem — 007-03)
  └── /clientes/:id (ficha do cliente — 007-03)
        └── /clientes/:id/lista-desejos (lista de desejos)
              ├── [adicionar item com dados válidos] → permanece em /clientes/:id/lista-desejos com o item adicionado
              ├── [erro de validação ao adicionar] → permanece em /clientes/:id/lista-desejos com mensagem de erro
              ├── [remover item — confirmado] → permanece em /clientes/:id/lista-desejos com item removido
              └── [voltar] → /clientes/:id (ficha do cliente)
```

### Entrada de navegação

O acesso a `/clientes/:id/lista-desejos` se dá pelo botão ou link "Lista de Desejos" presente na ficha do cliente (`/clientes/:id`). O acesso à ficha do cliente parte da listagem de clientes (`/clientes`), que está no menu lateral visível para **Gerente** e **Administrador**.
