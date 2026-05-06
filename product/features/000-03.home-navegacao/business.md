# Home e Navegação

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Tela principal do sistema e estrutura de navegação global. Centraliza o acesso a todas as funcionalidades, exibindo apenas as opções que o perfil do usuário logado tem permissão de acessar.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- React 19, TypeScript, Vite
- JWT (leitura de perfis para controle de exibição no frontend)
- Spring Boot 4 (backend — sem endpoint específico para home)

## Regras de negócio

1. A tela home é o ponto de entrada após autenticação bem-sucedida.
2. O menu de navegação exibe somente as seções acessíveis ao(s) perfil(is) do usuário logado.
3. Itens de menu para os quais o usuário não tem permissão são ocultados (não desabilitados).
4. Um usuário com múltiplos perfis vê a união das permissões de todos os seus perfis.
5. A tela home exibe a identificação do usuário logado (nome e perfil(is)).
6. Notificações in-app (chegada de livros da wishlist, livro encalhado) são exibidas em ícone no canto superior direito, acessíveis de qualquer tela.
7. A filial atual do usuário é exibida na interface; Administrator pode trocar de filial via seletor.

### Mapa de permissões por perfil

| Seção | Administrator | Manager | Catalog | Cashier |
|---|---|---|---|---|
| Cadastro de livros | ✓ | ✓ | ✓ | — |
| Gestão de estoque | ✓ | ✓ | ✓ | — |
| Etiquetas | ✓ | ✓ | ✓ | — |
| PDV / Vendas | ✓ | ✓ | ✓ | ✓ |
| Descontos | ✓ | ✓ | — | — |
| Vouchers | ✓ | ✓ | — | — |
| Compra de usados | ✓ | ✓ | — | — |
| Clientes | ✓ | ✓ | — | — |
| Relatórios | ✓ | ✓ | — | — |
| Rastreio de tempo em estante | ✓ | ✓ | — | — |
| Histórico de preços | ✓ | ✓ | — | — |
| Pesquisa de livros | ✓ | ✓ | ✓ | ✓ |
| Métodos de pagamento | ✓ | ✓ | — | — |
| Usuários e acesso | ✓ | ✓* | — | — |
| Gestão de filiais | ✓ | — | — | — |

*Manager gerencia apenas usuários da própria filial.

## Critérios de aceite

```gherkin
Cenário: Cashier vê apenas opções permitidas
  Dado que sou um usuário com perfil Cashier
  Quando acesso a tela home
  Então vejo no menu: PDV/Vendas e Pesquisa de livros
  E não vejo: Cadastro de livros, Descontos, Clientes, Relatórios

Cenário: Usuário com múltiplos perfis vê união de permissões
  Dado que sou um usuário com perfis Catalog e Cashier
  Quando acesso a tela home
  Então vejo a união das seções permitidas para Catalog e Cashier

Cenário: Notificação in-app visível em qualquer tela
  Dado que tenho notificações não lidas
  Quando navego por qualquer tela do sistema
  Então o ícone de notificação no canto superior direito exibe o contador

Cenário: Administrator troca de filial
  Dado que sou Administrator
  Quando clico no seletor de filial
  Então vejo todas as filiais cadastradas
  E ao selecionar uma filial o contexto da interface muda para essa filial

Cenário: Acesso direto a URL protegida sem permissão
  Dado que sou usuário com perfil Cashier
  Quando tento acessar diretamente a URL de Relatórios
  Então sou redirecionado para tela de acesso negado
```

## Quem pode acessar

- Tela home: qualquer usuário autenticado com ao menos um perfil
- Cada seção: conforme mapa de permissões acima

## Fora de escopo

- Dashboard com métricas ou gráficos na home
- Personalização de menu pelo usuário
- Atalhos de teclado globais
- Tema escuro / preferências visuais
