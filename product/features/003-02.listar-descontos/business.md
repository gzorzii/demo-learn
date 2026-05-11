# Listar Descontos

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe todos os descontos configurados na filial do usuário autenticado, com informações de escopo, valor, tipo e status de vigência (ativo, expirado ou agendado). É a tela central do módulo de descontos: ponto de entrada para criar um novo desconto e para acionar a remoção de um existente.

## Atores envolvidos

- **Gerente** — consulta, cria e remove descontos da própria filial a partir desta tela.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. A listagem exibe apenas os descontos da filial do usuário autenticado.
2. Cada desconto na lista apresenta: escopo (com resumo — ex.: "Categoria: Ficção Científica"), tipo de valor, valor, período de vigência (quando informado) e status calculado.
3. O status é calculado em tempo real com base em `starts_at`, `ends_at` e `active`:
   - **Ativo** — `active = true` e dentro do período de vigência (ou sem período definido).
   - **Agendado** — `active = true` e `starts_at` ainda não atingido.
   - **Expirado** — `ends_at` no passado (independente de `active`).
4. A listagem inclui descontos expirados para fins de histórico — eles não são excluídos automaticamente.
5. A lista deve ser ordenada por padrão com descontos ativos primeiro, seguidos de agendados e expirados, e dentro de cada grupo em ordem decrescente de criação.
6. O Gerente pode acionar a remoção de qualquer desconto diretamente da lista (ação da feature `003-03.remover-desconto`).
7. O botão "Novo Desconto" na listagem leva ao formulário de criação (feature `003-01.criar-desconto`).

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente ou Administrador
Quando acessa /discounts
Então o sistema exibe a listagem de descontos da filial
E cada item exibe: escopo resumido, tipo de valor, valor, período de vigência e status calculado

Dado que a filial possui descontos com statuses distintos (ativo, agendado, expirado)
Quando a listagem é carregada
Então os descontos ativos aparecem primeiro, seguidos dos agendados e depois dos expirados
E dentro de cada grupo a ordenação é por data de criação decrescente

Dado que a filial não possui nenhum desconto cadastrado
Quando o usuário acessa /discounts
Então o sistema exibe uma mensagem informativa indicando ausência de descontos
E o botão "Novo Desconto" permanece visível e funcional

Dado que o usuário aciona "Novo Desconto"
Quando clica no botão
Então é redirecionado para /discounts/new

Dado que o usuário aciona "Remover" em um desconto da lista
Quando confirma a remoção (fluxo de 003-03)
Então o desconto é removido e a lista é atualizada sem ele
```

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador.

## Fora de escopo

- Filtros ou busca na listagem (o volume esperado de descontos por filial é pequeno).
- Visualização de detalhes expandidos de um desconto em tela separada.
- Edição inline de campos do desconto.
- Exportação da listagem para Excel ou PDF.
- Descontos de outras filiais (o escopo é sempre a filial do usuário autenticado).

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Listagem de descontos | `/discounts` | Visualizar todos os descontos da filial, criar novo e acionar remoção |

### Diagrama de navegação

```
/ (home) ou menu lateral → "Gestão de Descontos"
  └── /discounts (listagem)
        ├── [Novo Desconto] → /discounts/new (feature 003-01)
        └── [Remover] em item da lista → confirmação → permanece em /discounts com item removido (feature 003-03)
```

### Nota de navegação

A entrada "Gestão de Descontos" no menu de navegação lateral aponta diretamente para `/discounts` e é visível apenas para Administrador e Gerente, conforme a tabela de permissões em `000-03.home-navegacao`. Esta é a rota raiz do módulo 003; todas as demais rotas do módulo partem daqui.
