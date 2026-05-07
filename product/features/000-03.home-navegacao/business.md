# Home e Navegação

**Delivery status:** Concluído

## Nome do recurso e objetivo

Infrastructure feature — not a business feature.

Define a tela inicial (home) e a estrutura de navegação do sistema. A home centraliza o acesso a todas as telas disponíveis e exibe apenas as opções que o perfil do usuário autenticado tem permissão de acessar. As permissões derivam diretamente dos perfis definidos em `product/description.md`.

## Stack envolvida

- React 19 / TypeScript — tela de home e menu de navegação
- React Router — roteamento client-side com proteção de rotas
- JWT (payload decodificado pelo frontend) — leitura de `roles`, `name`, `email`, `branchId` para controle de exibição
- Spring Boot 4 — backend não expõe endpoint específico para a home; a navegação é inteiramente client-side

## Perfis e permissões de acesso por módulo

A tabela abaixo define quais módulos cada perfil pode acessar, derivados das responsabilidades descritas em `product/description.md`.

| Módulo / Tela | Administrador | Gerente | Catalogador | Caixa |
|---|:---:|:---:|:---:|:---:|
| Cadastro de livros | ✓ | ✓ | ✓ | — |
| Busca de livros | ✓ | ✓ | ✓ | ✓ |
| Controle de estoque | ✓ | ✓ | ✓ | — |
| Impressão de etiquetas | ✓ | ✓ | ✓ | — |
| PDV / Vendas | ✓ | ✓ | — | ✓ |
| Gestão de descontos | ✓ | ✓ | — | — |
| Vouchers (emissão) | ✓ | ✓ | — | — |
| Compra de usados | ✓ | ✓ | — | — |
| Clientes | ✓ | ✓ | — | — |
| Métodos de pagamento | ✓ | ✓ | — | — |
| Relatórios | ✓ | ✓ | — | — |
| Histórico de preços | ✓ | ✓ | — | — |
| Tempo em prateleira | ✓ | ✓ | — | — |
| Gestão de usuários | ✓ | ✓* | — | — |
| Gestão de filiais | ✓ | — | — | — |
| Notificações | ✓ | ✓ | — | ✓ |

> *Gerente gerencia apenas usuários da própria filial. Administrador gerencia todas as filiais.

## Regras de negócio

1. A tela inicial é a primeira tela exibida após o login bem-sucedido.
2. A home exibe apenas os módulos que o perfil do usuário autenticado tem permissão de acessar, conforme a tabela acima.
3. Módulos sem permissão não são exibidos na home nem no menu de navegação — não aparecem como itens desabilitados.
4. O frontend lê os perfis do usuário a partir do payload do JWT (campo `roles`) decodificado do cookie, sem comunicação adicional com o backend.
5. Um usuário com múltiplos perfis enxerga a união das permissões de todos os seus perfis.
6. O menu de navegação lateral (ou superior) permanece visível em todas as telas autenticadas e segue as mesmas regras de exibição da home.
7. O nome do usuário autenticado e sua filial (quando aplicável) são exibidos na interface (ex.: header ou perfil).
8. O Administrador não pertence a uma filial específica; sua tela exibe contexto global ou permite selecionar uma filial para consulta.
9. Notificações (chegada de livro desejado, livro vencido na prateleira) são exibidas no canto superior direito da tela para os perfis Gerente e Caixa — e para o Administrador quando estiver no contexto de uma filial.
10. Rotas do frontend que exigem um perfil específico redirecionam para a home (ou para uma tela de "acesso negado") caso o usuário não possua permissão.
11. A tela de login é a única rota pública; todas as demais requerem autenticação válida (JWT via cookie).

## Critérios de aceitação

```gherkin
# language: pt

Funcionalidade: Home e navegação com controle de acesso por perfil

  Cenário: Caixa vê apenas os módulos permitidos
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    Quando acessa a tela inicial
    Então deve visualizar os módulos "PDV / Vendas", "Busca de livros" e "Notificações"
    E não deve visualizar "Cadastro de livros", "Descontos", "Relatórios" nem "Gestão de filiais"

  Cenário: Catalogador vê apenas os módulos permitidos
    Dado que o usuário autenticado possui apenas o perfil "Catalogador"
    Quando acessa a tela inicial
    Então deve visualizar "Cadastro de livros", "Busca de livros", "Controle de estoque" e "Impressão de etiquetas"
    E não deve visualizar "PDV / Vendas", "Descontos" nem "Relatórios"

  Cenário: Gerente vê todos os módulos da própria filial
    Dado que o usuário autenticado possui o perfil "Gerente"
    Quando acessa a tela inicial
    Então deve visualizar todos os módulos exceto "Gestão de filiais"

  Cenário: Administrador vê todos os módulos incluindo gestão de filiais
    Dado que o usuário autenticado possui o perfil "Administrador"
    Quando acessa a tela inicial
    Então deve visualizar todos os módulos, incluindo "Gestão de filiais"

  Cenário: Usuário com múltiplos perfis recebe a união das permissões
    Dado que o usuário autenticado possui os perfis "Catalogador" e "Caixa"
    Quando acessa a tela inicial
    Então deve visualizar a união dos módulos permitidos para cada perfil

  Cenário: Acesso direto a rota sem permissão
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    Quando tenta acessar diretamente a URL de "Gestão de descontos"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado

  Cenário: Informações do usuário exibidas na interface
    Dado que o usuário está autenticado
    Quando qualquer tela do sistema é exibida
    Então o nome do usuário deve aparecer no header ou área de perfil
    E a filial associada deve ser exibida (quando aplicável)

  Cenário: Menu de navegação lateral segue as mesmas permissões da home
    Dado que o usuário autenticado possui o perfil "Caixa"
    Quando navega para qualquer tela do sistema
    Então o menu lateral exibe apenas os módulos permitidos para "Caixa"

  Cenário: Rota pública de login acessível sem autenticação
    Dado que nenhum cookie de autenticação está presente no browser
    Quando o usuário tenta acessar qualquer rota protegida
    Então é redirecionado para a tela de login

  Cenário: Notificação exibida para Gerente e Caixa
    Dado que o usuário autenticado possui o perfil "Gerente" ou "Caixa"
    Quando há notificações não lidas disponíveis
    Então um indicador de notificação aparece no canto superior direito da tela
```

## Quem pode acessar

- A tela de login (`/login`) é pública.
- A tela inicial (`/`) e o menu de navegação são acessíveis a qualquer usuário autenticado (JWT válido).
- O conteúdo exibido em cada tela varia conforme o perfil, conforme descrito nas regras acima.

## Fora do escopo

- Criação de menus customizáveis pelo usuário ou administrador.
- Configuração de permissões por tela além dos perfis fixos.
- Página de "acesso negado" elaborada (pode ser simples redirecionamento para home).
- Tour guiado ou onboarding interativo.
- Dashboard com gráficos ou KPIs na tela inicial (relatórios são módulo separado).
- Modo escuro ou personalização de tema.
- Aplicativo mobile ou desktop.
