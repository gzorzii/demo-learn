# Cadastrar Filial

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Administrador registre uma nova unidade física (filial) no sistema. Após o cadastro, a filial fica disponível para vínculo de usuários, estoque, descontos, vendas e demais módulos que dependem de `branch_id` como escopo.

## Atores envolvidos

- **Administrador** — único perfil com permissão de criar filiais.

## Regras de negócio

1. Apenas o Administrador pode acessar o formulário de cadastro de filial.
2. Campos obrigatórios: nome e endereço completo.
3. Campo opcional: telefone de contato.
4. O nome da filial deve ser único no sistema — duas filiais não podem ter o mesmo nome.
5. Ao criar a filial, ela nasce com `active = true`.
6. O campo `shelf_time_threshold` (prazo de alerta de prateleira) não é configurado no cadastro inicial; é definido posteriormente em `010-02.editar-filial`.
7. Após salvar, a nova filial já pode receber usuários e registros de outros módulos.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Administrador
Quando acessa o formulário de cadastro de filial
Então o formulário exibe os campos: nome, endereço e telefone

Dado que o usuário preenche nome e endereço válidos
Quando aciona "Salvar"
Então o sistema cria o registro da filial com active = true
E redireciona para a listagem de filiais com a nova filial exibida

Dado que o usuário tenta salvar sem preencher o campo "nome"
Quando aciona "Salvar"
Então o sistema exibe erro de validação no campo nome
E não cria o registro

Dado que o usuário tenta salvar sem preencher o campo "endereço"
Quando aciona "Salvar"
Então o sistema exibe erro de validação no campo endereço
E não cria o registro

Dado que já existe uma filial com o nome "Unidade Centro"
Quando o usuário tenta cadastrar outra filial com o mesmo nome
Então o sistema exibe mensagem de erro informando que o nome já está em uso
E não cria o registro

Dado que o usuário aciona "Cancelar" no formulário
Quando confirma o cancelamento
Então é redirecionado para a listagem de filiais sem criar nenhum registro
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador.

## Fora de escopo

- Configuração do prazo de alerta de prateleira no cadastro inicial (feito em `010-02.editar-filial`).
- Criação de usuários para a filial (coberto por módulo 009).
- Configuração de métodos de pagamento da filial (coberto por módulo 008).
- Importação de filiais em lote via arquivo.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de cadastro de filial | `/branches/new` | Preencher e salvar os dados de uma nova filial |

### Diagrama de navegação

```
/ (home) ou /branches (listagem de filiais)
  └── /branches/new (formulário de cadastro)
        ├── [salvar com sucesso] → /branches (listagem de filiais com a nova filial)
        ├── [cancelar] → /branches (listagem de filiais)
        └── [erro de validação] → permanece em /branches/new com mensagens de erro
```

### Nota de navegação

O acesso ao formulário ocorre pelo botão "Nova Filial" na listagem `/branches` (feature `010-03.listar-filiais`). A entrada no menu de navegação lateral é "Gestão de Filiais", visível somente para o Administrador, conforme `000-03.home-navegacao`.
