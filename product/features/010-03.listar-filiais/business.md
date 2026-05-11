# Listar Filiais

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe ao Administrador a lista completa de filiais cadastradas no sistema, com dados resumidos de cada unidade e acesso rápido às ações de cadastro e edição. É a tela central do módulo de gestão de filiais e ponto de entrada para as demais operações.

## Atores envolvidos

- **Administrador** — único perfil com acesso à listagem de filiais.

## Regras de negócio

1. Apenas o Administrador pode acessar a listagem de filiais.
2. A listagem exibe todas as filiais cadastradas, independentemente do status (`active = true` ou `active = false`).
3. Cada item da lista exibe: nome, endereço, telefone, status (ativa/inativa) e prazo de alerta de prateleira configurado (quando disponível).
4. A listagem permite filtrar por status (ativas, inativas ou todas).
5. A listagem oferece acesso ao formulário de cadastro de nova filial (`010-01.cadastrar-filial`).
6. Cada item da listagem oferece acesso direto ao formulário de edição da filial (`010-02.editar-filial`).
7. Não há exclusão de filial pela interface — apenas desativação via edição.
8. A listagem é ordenada por nome da filial em ordem alfabética por padrão.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Administrador
Quando acessa /branches
Então o sistema exibe a lista de todas as filiais cadastradas
E cada item exibe: nome, endereço, telefone, status (ativa/inativa) e prazo de alerta de prateleira (se configurado)

Dado que o usuário está na listagem de filiais
Quando aciona o filtro "Apenas ativas"
Então a listagem exibe somente filiais com active = true

Dado que o usuário está na listagem de filiais
Quando aciona o filtro "Apenas inativas"
Então a listagem exibe somente filiais com active = false

Dado que o usuário está na listagem de filiais
Quando aciona "Nova Filial"
Então é redirecionado para /branches/new

Dado que o usuário está na listagem de filiais
E existe uma filial na lista
Quando aciona "Editar" na linha da filial
Então é redirecionado para /branches/:id/edit

Dado que não há nenhuma filial cadastrada
Quando o usuário acessa /branches
Então o sistema exibe uma mensagem informando que nenhuma filial foi cadastrada
E exibe o botão "Nova Filial"

Dado que um usuário sem perfil Administrador tenta acessar /branches
Quando acessa a rota diretamente
Então é redirecionado para a tela inicial ou para uma tela de acesso negado
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador.

## Fora de escopo

- Visualização de estoque, usuários ou relatórios da filial nesta tela (cada módulo possui sua própria listagem escopada).
- Exclusão permanente de filiais (apenas desativação via `010-02.editar-filial`).
- Paginação avançada (volume de filiais tende a ser baixo; lista simples é suficiente).
- Exportação da listagem de filiais.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Listagem de filiais | `/branches` | Visualizar todas as filiais e acessar cadastro/edição |

### Diagrama de navegação

```
/ (home)
  └── /branches (listagem de filiais)
        ├── [Nova Filial] → /branches/new (010-01.cadastrar-filial)
        └── [Editar] → /branches/:id/edit (010-02.editar-filial)
```

### Nota de navegação

A tela `/branches` é o ponto de entrada do módulo "Gestão de Filiais". O menu de navegação lateral exibe a entrada "Gestão de Filiais" somente para o Administrador, conforme a tabela de permissões em `000-03.home-navegacao`. Ao clicar no item do menu, o Administrador é direcionado para `/branches`.
