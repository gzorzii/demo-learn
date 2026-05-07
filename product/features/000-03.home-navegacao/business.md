# 000-03 Home e Navegação

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Define a tela inicial do sistema e a estrutura de navegação global. A home centraliza o acesso a todas as telas e exibe apenas as opções que o perfil do usuário logado tem permissão de acessar. A navegação reflete o JWT vigente sem consultas adicionais ao banco.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- React 19 + TypeScript
- Vite 8
- JWT (campo `roles` e `branchId` do payload) — dados de autenticação de 000-02
- React Router (roteamento client-side)

## Regras de negócio

1. Ao acessar a raiz da aplicação (`/`) com JWT válido, o usuário é redirecionado para a home.
2. Ao acessar a raiz sem JWT (ou com JWT expirado), o usuário é redirecionado para a tela de login.
3. A home exibe apenas os módulos que o perfil do usuário logado tem permissão de acessar, derivados do campo `roles` do JWT.
4. Usuário com múltiplos perfis vê a união de todos os módulos permitidos pelos seus perfis.
5. Nenhuma opção de módulo proibido ao perfil é exibida — nem desabilitada, nem oculta com cadeado.
6. O nome do usuário e os perfis ativos são exibidos na interface (derivados do JWT, sem requisição adicional).
7. A filial do usuário é exibida na interface para perfis com escopo de filial (Gerente, Catalogador, Caixa). Administrador não exibe filial.
8. Um menu de navegação lateral ou superior persiste em todas as telas internas, exibindo apenas os módulos permitidos ao perfil.
9. A opção de logout está sempre visível para qualquer usuário autenticado.
10. Notificações in-app (wishlist e prateleira) aparecem em ícone de sino no canto superior direito para Gerente e Caixa.
11. Ao clicar em logout, o JWT é removido do armazenamento local e o usuário é redirecionado para a tela de login.

### Mapa de permissões por perfil

| Módulo                       | Administrador | Gerente | Catalogador | Caixa |
|------------------------------|:---:|:---:|:---:|:---:|
| Cadastro de Livros           |  ✓  |  ✓  |  ✓  |     |
| Gerenciamento de Estoque     |  ✓  |  ✓  |  ✓  |     |
| Configuração e Impressão de Etiquetas |  ✓  |  ✓  |  ✓  |     |
| PDV / Ponto de Venda         |  ✓  |  ✓  |     |  ✓  |
| Gerenciamento de Descontos   |  ✓  |  ✓  |     |     |
| Vouchers (emissão)           |  ✓  |  ✓  |     |     |
| Compra de Livros Usados (lote)|  ✓  |  ✓  |     |     |
| Gestão de Clientes           |  ✓  |  ✓  |     |     |
| Métodos de Pagamento         |  ✓  |  ✓  |     |     |
| Gestão de Usuários           |  ✓  |  ✓  |     |     |
| Gestão de Filiais            |  ✓  |     |     |     |
| Relatórios                   |  ✓  |  ✓  |     |     |
| Busca de Livros              |  ✓  |  ✓  |  ✓  |  ✓  |
| Prateleira (livros em atraso)|  ✓  |  ✓  |     |     |
| Histórico de Preços          |  ✓  |  ✓  |     |     |
| Configuração de Prateleira   |  ✓  |  ✓  |     |     |

## Critérios de aceite

```gherkin
Funcionalidade: Acesso à home e redirecionamento

  Cenário: Usuário autenticado acessa a raiz da aplicação
    Dado que o usuário possui JWT válido armazenado
    Quando acessa "/"
    Então é redirecionado para a home do sistema

  Cenário: Usuário não autenticado acessa rota protegida
    Dado que não há JWT armazenado (ou o JWT está expirado)
    Quando acessa qualquer rota protegida
    Então é redirecionado para a tela de login

Funcionalidade: Visibilidade de módulos por perfil

  Cenário: Caixa vê apenas os módulos do seu perfil
    Dado que o usuário logado possui apenas o perfil "Caixa"
    Quando a home é exibida
    Então apenas "PDV / Ponto de Venda" e "Busca de Livros" são visíveis no menu
    E módulos como "Gestão de Filiais" e "Relatórios" não aparecem na interface

  Cenário: Catalogador vê apenas os módulos do seu perfil
    Dado que o usuário logado possui apenas o perfil "Catalogador"
    Quando a home é exibida
    Então apenas "Cadastro de Livros", "Gerenciamento de Estoque", "Configuração e Impressão de Etiquetas" e "Busca de Livros" são visíveis

  Cenário: Gerente vê todos os módulos de filial exceto Gestão de Filiais
    Dado que o usuário logado possui apenas o perfil "Gerente"
    Quando a home é exibida
    Então "Gestão de Filiais" não aparece na interface
    E os demais módulos permitidos ao Gerente são exibidos

  Cenário: Administrador vê todos os módulos
    Dado que o usuário logado possui o perfil "Administrador"
    Quando a home é exibida
    Então todos os módulos do sistema são visíveis

  Cenário: Usuário com múltiplos perfis vê união dos módulos
    Dado que o usuário logado possui os perfis "Catalogador" e "Caixa"
    Quando a home é exibida
    Então os módulos de ambos os perfis são exibidos sem duplicatas

Funcionalidade: Informações do usuário na interface

  Cenário: Nome e perfis exibidos na barra de navegação
    Dado que o usuário está autenticado
    Quando qualquer tela interna é exibida
    Então o nome do usuário aparece na barra de navegação
    E os perfis ativos são exibidos

  Cenário: Filial exibida para perfis com escopo de filial
    Dado que o usuário logado possui perfil "Gerente"
    Quando qualquer tela interna é exibida
    Então o nome da filial é exibido na barra de navegação

  Cenário: Administrador não exibe filial
    Dado que o usuário logado possui apenas o perfil "Administrador"
    Quando qualquer tela interna é exibida
    Então nenhuma filial é exibida na barra de navegação

Funcionalidade: Logout

  Cenário: Logout remove JWT e redireciona para login
    Dado que o usuário está autenticado
    Quando clica em "Sair"
    Então o JWT é removido do armazenamento local do navegador
    E o usuário é redirecionado para a tela de login

Funcionalidade: Notificações in-app

  Cenário: Ícone de sino visível para Gerente e Caixa
    Dado que o usuário logado possui perfil "Gerente" ou "Caixa"
    Quando qualquer tela interna é exibida
    Então o ícone de notificações no canto superior direito está visível

  Cenário: Ícone de sino não visível para Catalogador
    Dado que o usuário logado possui apenas o perfil "Catalogador"
    Quando qualquer tela interna é exibida
    Então o ícone de notificações não é exibido
```

## Quem pode acessar

- A home e a navegação são acessíveis a qualquer usuário autenticado com ao menos um perfil.
- O conteúdo exibido varia conforme o perfil derivado do JWT.

## Fora de escopo

- Design detalhado de cada módulo — apenas o ponto de entrada (link/card) é coberto aqui.
- Notificações push ou por e-mail.
- Personalização da home pelo usuário (reordenação, favoritos).
- Página de perfil/configurações do usuário.
- Tema escuro ou preferências visuais.
