# Registrar Compra de Lote de Usados

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Gerente registre a aquisição de um lote de livros usados trazido por um vendedor externo. O registro captura os dados da transação — quem vendeu, quando, valor total pago, forma de pagamento, filial e quantidade estimada de livros — e cria o lote no sistema com status "aberto". Ao registrar, o Gerente pode opcionalmente emitir um voucher de crédito para o vendedor (quando este for um cliente cadastrado).

## Atores envolvidos

- **Gerente** — avalia e registra o lote de compra; decide se emite voucher ao vendedor.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Somente o Gerente (ou Administrador) pode registrar um lote de compra.
2. O lote pertence à filial do usuário autenticado (ou à filial selecionada pelo Administrador).
3. Campos obrigatórios: nome do vendedor, valor total pago, forma de pagamento e data da compra.
4. A forma de pagamento aceita é exclusivamente `cash` (dinheiro) ou `pix`.
5. A quantidade estimada de livros é um campo informativo opcional que serve de referência para acompanhar o progresso de cadastro em `006-02.gerenciar-livros-lote`.
6. O campo `notes` é opcional e registra observações gerais sobre o estado geral do lote.
7. O lote é criado com status "aberto" imediatamente após o registro.
8. Ao registrar o lote, o Gerente pode optar por emitir um voucher de crédito para o vendedor. Para isso, o vendedor deve ser um cliente previamente cadastrado no sistema. A emissão do voucher segue as mesmas regras da feature `005-01.emitir-voucher`.
9. Nenhum documento é gerado para o vendedor ao concluir o registro do lote — a transação é puramente interna.
10. O campo `purchased_at` pode ser informado manualmente pelo Gerente para registrar a data real da transação, que pode diferir da data de registro no sistema.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente ou Administrador
Quando acessa o formulário de registro de lote de compra
Então o formulário exibe os campos: nome do vendedor, valor total pago, forma de pagamento, data da compra, quantidade estimada de livros e observações

Dado que o usuário preenche todos os campos obrigatórios com dados válidos
Quando aciona "Registrar lote"
Então o sistema cria o lote com status "aberto"
E redireciona para a tela de gerenciamento de livros do lote recém-criado (/purchases/:id/books)

Dado que o usuário informa valor total pago igual a zero ou negativo
Quando aciona "Registrar lote"
Então o sistema exibe mensagem de erro no campo "valor total pago"
E não cria o lote

Dado que o usuário seleciona "Emitir voucher para o vendedor"
E o vendedor informado não corresponde a nenhum cliente cadastrado na filial
Quando aciona "Registrar lote"
Então o sistema exibe mensagem de erro informando que o vendedor não está cadastrado como cliente
E não cria o lote

Dado que o usuário seleciona "Emitir voucher para o vendedor"
E informa um cliente cadastrado como vendedor e um valor de voucher válido
Quando aciona "Registrar lote"
Então o sistema cria o lote
E emite um voucher de crédito vinculado ao cliente informado com o valor especificado
E exibe confirmação de voucher emitido

Dado que o usuário aciona "Cancelar"
Então é redirecionado para a listagem de lotes de compra (/purchases) sem criar nenhum registro
```

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador.

## Fora de escopo

- Cadastro dos livros do lote nesta tela — gerenciado em `006-02.gerenciar-livros-lote` e `001-01.cadastrar-livro`.
- Edição de um lote já registrado.
- Cancelamento ou exclusão de lotes.
- Geração de documento fiscal ou comprovante para o vendedor.
- Pagamentos parcelados ou em múltiplas formas de pagamento para a compra do lote (a venda ao cliente é simples, em dinheiro ou PIX).
- Vínculo automático do vendedor a um cliente cadastrado — a associação ao voucher é explícita e opcional.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Listagem de lotes de compra | `/purchases` | Exibir todos os lotes registrados na filial, com status e dados resumidos |
| Formulário de registro de lote | `/purchases/new` | Preencher e salvar os dados de um novo lote de compra |

### Diagrama de navegação

```
/ (home) ou menu "Compra de Usados"
  └── /purchases (listagem de lotes)
        └── /purchases/new (formulário de registro)
              ├── [registrar com sucesso, sem voucher] → /purchases/:id/books (gerenciamento do lote)
              ├── [registrar com sucesso, com voucher emitido] → /purchases/:id/books (com confirmação de voucher)
              └── [cancelar] → /purchases (listagem de lotes)
```

### Nota de navegação

O acesso ao módulo é feito pela entrada "Compra de Usados" no menu de navegação lateral, visível para perfis Gerente e Administrador (conforme tabela de permissões em `000-03.home-navegacao`). A listagem `/purchases` é a tela de entrada do módulo; o botão "Novo lote" na listagem leva ao formulário `/purchases/new`.
