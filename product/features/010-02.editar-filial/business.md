# Editar Filial

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Administrador altere os dados cadastrais de uma filial existente e configure o prazo de alerta de tempo em prateleira (`days_threshold`). É nesta tela que o limiar de dias para alertar o Gerente sobre livros próximos ao vencimento de prateleira é definido ou atualizado para a filial.

## Atores envolvidos

- **Administrador** — único perfil com permissão de editar filiais e configurar o prazo de prateleira.

## Regras de negócio

1. Apenas o Administrador pode editar dados de uma filial.
2. Campos editáveis: nome, endereço, telefone e flag `active` (ativar/desativar a filial).
3. O nome da filial deve permanecer único — não é permitido alterar o nome para um já usado por outra filial.
4. Desativar uma filial (`active = false`) impede que os usuários vinculados a ela autentiquem, mas não exclui nenhum dado.
5. O prazo de alerta de prateleira (`days_threshold`) é configurado nesta tela. Trata-se do número de dias que, após o `registered_at` de um livro, o sistema gera alertas para o Gerente da filial (feature `012-xx`).
6. O `days_threshold` deve ser um número inteiro positivo (mínimo 1 dia).
7. Se a filial ainda não possui um registro em `shelf_threshold`, a edição cria o registro. Se já existe, atualiza o valor existente — respeitando a constraint de unicidade por `branch_id`.
8. O campo `days_threshold` é opcional nesta tela: o Administrador pode salvar alterações cadastrais sem definir o prazo de prateleira.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Administrador
E existe uma filial cadastrada no sistema
Quando acessa a tela de edição da filial
Então o formulário exibe os dados atuais: nome, endereço, telefone, status ativo/inativo
E exibe o campo "Prazo de alerta de prateleira (dias)" com o valor atual (se configurado) ou em branco

Dado que o usuário altera o nome para um valor único
Quando aciona "Salvar"
Então o sistema atualiza os dados da filial
E redireciona para a listagem de filiais

Dado que o usuário tenta salvar com o nome de outra filial existente
Quando aciona "Salvar"
Então o sistema exibe mensagem de erro informando que o nome já está em uso
E não salva a alteração

Dado que o usuário informa um days_threshold de 30
E a filial ainda não possui shelf_threshold configurado
Quando aciona "Salvar"
Então o sistema cria um registro em shelf_threshold com days_threshold = 30 para a filial

Dado que a filial já possui shelf_threshold = 60
E o usuário altera o days_threshold para 45
Quando aciona "Salvar"
Então o sistema atualiza o registro existente em shelf_threshold para days_threshold = 45
E não cria um novo registro

Dado que o usuário informa days_threshold = 0 ou valor negativo
Quando aciona "Salvar"
Então o sistema exibe erro de validação no campo
E não salva a alteração

Dado que o usuário desativa a filial (active = false)
Quando aciona "Salvar"
Então o sistema marca a filial como inativa
E os usuários vinculados a ela não conseguem mais autenticar

Dado que o usuário aciona "Cancelar" sem salvar
Quando confirma o cancelamento
Então é redirecionado para a listagem de filiais sem alterações

Dado que o usuário tenta acessar a edição de uma filial inexistente
Quando acessa a rota /branches/:id/edit com um ID inválido
Então o sistema exibe mensagem de erro e redireciona para a listagem de filiais
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador.

## Fora de escopo

- Exclusão permanente de filiais (apenas desativação via flag `active`).
- Transferência de usuários ou estoque entre filiais.
- Configuração de métodos de pagamento (coberto por módulo 008).
- Configuração do prazo de prateleira pelo Gerente (coberto por `012-xx`).
- Visualização de relatórios ou estoque da filial nesta tela.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de edição de filial | `/branches/:id/edit` | Alterar dados cadastrais e configurar prazo de alerta de prateleira |

### Diagrama de navegação

```
/branches (listagem de filiais)
  └── /branches/:id/edit (formulário de edição)
        ├── [salvar com sucesso] → /branches (listagem de filiais)
        ├── [cancelar] → /branches (listagem de filiais)
        └── [erro de validação] → permanece em /branches/:id/edit com mensagens de erro
```

### Nota de navegação

O acesso à edição ocorre pelo botão "Editar" presente em cada linha da listagem `/branches` (feature `010-03.listar-filiais`). A entrada no menu de navegação lateral é "Gestão de Filiais", visível somente para o Administrador, conforme `000-03.home-navegacao`.
