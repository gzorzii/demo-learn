# Clientes — Módulo 007

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pelo cadastro e gestão de clientes da livraria. Centraliza as informações de contato dos clientes (nome, telefone, endereço e CPF/CNPJ), que são essenciais para a emissão futura de notas fiscais (NF-e) e para a vinculação com vouchers de crédito e listas de desejos. O módulo abrange o ciclo completo de gestão do cliente: cadastro, edição, listagem e gerenciamento da lista de desejos por ISBN ou título.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `007-01.cadastrar-cliente` | Registrar novo cliente com dados de contato e CPF/CNPJ |
| `007-02.editar-cliente` | Alterar dados de um cliente existente |
| `007-03.listar-clientes` | Listar os clientes da filial com filtros de busca |
| `007-04.gerenciar-lista-desejos` | Adicionar e remover itens da lista de desejos de um cliente |

## Atores envolvidos

- **Gerente** — cadastra, edita e consulta clientes; gerencia listas de desejos; acessa no contexto da própria filial.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.
- **Caixa** — consulta clientes apenas no contexto do PDV (módulo 004); não acessa este módulo diretamente.

## Modelo de dados

Este módulo opera sobre as tabelas `customer` e `customer_wishlist`, já definidas em `000-01.modelagem-dados`:

**`customer`** — Dados cadastrais do cliente.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `name` | TEXT | Nome completo |
| `phone` | TEXT | Telefone de contato |
| `address` | TEXT | Endereço |
| `cpf_cnpj` | TEXT | CPF ou CNPJ (sem formatação); único por filial |
| `branch_id` | UUID | FK → `branch.id`; filial onde foi cadastrado |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

**`customer_wishlist`** — Itens desejados pelo cliente.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `customer_id` | UUID | FK → `customer.id` |
| `branch_id` | UUID | FK → `branch.id` |
| `title` | TEXT | Título desejado (obrigatório) |
| `author` | TEXT | Autor (opcional) |
| `isbn` | TEXT | ISBN (opcional) |
| `notified` | BOOLEAN | `true` quando a notificação de chegada já foi disparada |
| `created_at` | TIMESTAMP | Data do registro do interesse |

## Regras de negócio

1. O CPF/CNPJ é único dentro de uma filial — não pode haver dois clientes com o mesmo CPF/CNPJ na mesma filial.
2. O CPF/CNPJ é armazenado sem formatação (apenas dígitos).
3. O CPF/CNPJ é coletado para futura emissão de NF-e; sua validação de formato deve ser feita na interface.
4. Clientes são escopados por filial — cada filial mantém sua própria base de clientes.
5. A lista de desejos de um cliente pode conter múltiplos itens; cada item representa um livro de interesse não disponível em estoque.
6. Quando um livro é cadastrado no catálogo (feature `001-01.cadastrar-livro`), o sistema verifica se algum item da lista de desejos corresponde ao livro recém-cadastrado e, em caso positivo, dispara notificação in-app para Gerentes e Caixas da filial (feature `014-01`). A geração da notificação não é responsabilidade deste módulo.
7. Um item da lista de desejos com `notified = true` indica que a notificação de chegada já foi enviada; não deve ser notificado novamente.

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. O Caixa não acessa o módulo de clientes diretamente; sua consulta a clientes ocorre apenas dentro do fluxo do PDV. Conforme a tabela de permissões em `000-03.home-navegacao`, o item "Clientes" no menu de navegação é visível apenas para Gerente e Administrador.

## Fora de escopo

- Portal ou interface de autoatendimento para o cliente.
- Envio de notificações ao cliente (e-mail, SMS, WhatsApp).
- Programa de fidelidade ou pontuação.
- Histórico de compras vinculado ao cliente (relatórios são cobertos no módulo 011).
- Transferência de cliente entre filiais.
- Emissão de NF-e (coletamos os dados para uso futuro, fora do escopo atual).
- Geração da notificação de chegada de livro desejado (responsabilidade do módulo 014-01).
