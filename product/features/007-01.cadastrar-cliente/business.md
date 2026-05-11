# Cadastrar Cliente

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente registrar um novo cliente na filial, informando nome, telefone, endereço e CPF ou CNPJ. O cadastro do cliente é pré-requisito para a emissão de vouchers de crédito (módulo 005) e para o registro de lista de desejos (007-04). O CPF/CNPJ é coletado para futura integração com emissão de NF-e.

## Atores envolvidos

- **Gerente** — cria novos clientes na própria filial.
- **Administrador** — pode criar clientes no contexto da filial selecionada.

## Regras de negócio

1. Os campos obrigatórios são: nome e CPF/CNPJ. Telefone e endereço são opcionais.
2. O CPF/CNPJ deve ser único dentro da filial — não pode haver dois clientes com o mesmo documento na mesma filial.
3. O CPF/CNPJ é armazenado sem formatação (apenas dígitos); a interface pode exibir a máscara, mas o valor persistido não contém pontos, traços ou barras.
4. O formato do CPF (11 dígitos) ou CNPJ (14 dígitos) deve ser validado na interface antes da submissão.
5. O cliente é automaticamente vinculado à filial do usuário autenticado no momento do cadastro.
6. Após o cadastro, o sistema exibe a ficha do cliente recém-criado e oferece acesso imediato à sua lista de desejos.

## Critérios de aceite

```gherkin
Funcionalidade: Cadastrar cliente

  Cenário: Cadastro bem-sucedido com todos os dados
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando acessa o formulário de cadastro de cliente
    E preenche "nome = Ana Souza", "cpf_cnpj = 12345678901", "telefone = 11999990000", "endereço = Rua A, 10"
    E confirma o cadastro
    Então um registro em "customer" é criado com os dados informados
    E o campo "branch_id" é preenchido com a filial do Gerente autenticado
    E o sistema exibe a ficha do cliente recém-cadastrado

  Cenário: Cadastro bem-sucedido com dados mínimos
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando preenche apenas "nome = Carlos Lima" e "cpf_cnpj = 12345678901"
    E confirma o cadastro
    Então o registro é criado com sucesso
    E os campos "telefone" e "endereço" ficam em branco

  Cenário: Tentativa de cadastro sem CPF/CNPJ
    Dado que o usuário está no formulário de cadastro
    Quando preenche apenas o nome e não informa o CPF/CNPJ
    E tenta confirmar
    Então o sistema exibe erro de validação "CPF/CNPJ é obrigatório"
    E o cliente não é criado

  Cenário: Tentativa de cadastro com CPF/CNPJ já existente na filial
    Dado que já existe um cliente com CPF "12345678901" na filial
    Quando o Gerente tenta cadastrar outro cliente com o mesmo CPF na mesma filial
    E confirma o cadastro
    Então o sistema exibe erro "CPF/CNPJ já cadastrado nesta filial"
    E o cliente não é criado

  Cenário: Tentativa de cadastro com CPF/CNPJ em formato inválido
    Dado que o usuário está no formulário de cadastro
    Quando informa "cpf_cnpj = 123" (menos de 11 dígitos)
    E tenta confirmar
    Então o sistema exibe erro de validação de formato
    E o cliente não é criado

  Cenário: Perfil sem permissão não acessa o formulário
    Dado que o usuário autenticado possui apenas o perfil "Catalogador"
    Quando tenta acessar a rota "/clientes/novo"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/clientes/novo` é protegida; perfis sem permissão são redirecionados.

## Fora de escopo

- Auto-cadastro pelo próprio cliente (não há portal de autoatendimento).
- Importação de clientes em lote via arquivo.
- Validação de CPF/CNPJ junto à Receita Federal (apenas validação de formato).
- Cadastro de cliente sem vínculo a uma filial.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Formulário de cadastro de cliente | `/clientes/novo` | Preencher e confirmar os dados do novo cliente |

### Diagrama de navegação

```
/clientes (listagem — 007-03)
  └── /clientes/novo (formulário de cadastro)
        ├── [confirmar com dados válidos] → /clientes/:id (ficha do cliente)
        ├── [cancelar] → /clientes
        └── [erro de validação] → permanece em /clientes/novo com mensagens de erro
```

### Entrada de navegação

O acesso a `/clientes/novo` se dá pelo botão "Novo Cliente" presente na tela de listagem de clientes (`/clientes`). Conforme a tabela de permissões em `000-03.home-navegacao`, o módulo "Clientes" é visível apenas para **Gerente** e **Administrador**.
