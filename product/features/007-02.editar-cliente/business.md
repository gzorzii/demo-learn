# Editar Cliente

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente alterar os dados cadastrais de um cliente existente na filial: nome, telefone, endereço e CPF/CNPJ. A edição é acessada a partir da ficha do cliente. Garante que as informações de contato e identificação fiscal permaneçam atualizadas.

## Atores envolvidos

- **Gerente** — edita clientes da própria filial.
- **Administrador** — edita clientes no contexto da filial selecionada.

## Regras de negócio

1. Apenas clientes da filial do usuário autenticado podem ser editados.
2. Os campos disponíveis para edição são: nome, telefone, endereço e CPF/CNPJ.
3. O campo nome continua obrigatório após a edição.
4. O CPF/CNPJ continua obrigatório e deve manter unicidade dentro da filial — se o novo valor já pertencer a outro cliente da mesma filial, a edição é rejeitada.
5. O CPF/CNPJ é armazenado sem formatação (apenas dígitos); a interface exibe a máscara, mas o valor persistido não contém pontos, traços ou barras.
6. O formato do CPF (11 dígitos) ou CNPJ (14 dígitos) é validado na interface antes da submissão.
7. Alterações são confirmadas com um botão de salvar; o cancelamento descarta as mudanças e retorna à ficha do cliente sem alterações.

## Critérios de aceite

```gherkin
Funcionalidade: Editar cliente

  Cenário: Edição bem-sucedida de dados de contato
    Dado que o usuário autenticado possui perfil "Gerente"
    E existe um cliente "Ana Souza" cadastrado na filial
    Quando acessa a ficha do cliente e clica em "Editar"
    E altera o telefone para "11888880000"
    E confirma
    Então o registro em "customer" é atualizado com o novo telefone
    E o campo "updated_at" é atualizado com o timestamp atual
    E o sistema retorna à ficha do cliente com os dados atualizados

  Cenário: Tentativa de salvar sem nome
    Dado que o Gerente está no formulário de edição de um cliente
    Quando apaga o campo "nome" e tenta salvar
    Então o sistema exibe erro de validação "Nome é obrigatório"
    E o registro não é alterado

  Cenário: Tentativa de alterar CPF/CNPJ para um já cadastrado na filial
    Dado que existem dois clientes na filial, "cliente A" com CPF "11111111111" e "cliente B" com CPF "22222222222"
    Quando o Gerente edita "cliente A" e altera o CPF para "22222222222"
    E tenta salvar
    Então o sistema exibe erro "CPF/CNPJ já cadastrado nesta filial"
    E o registro não é alterado

  Cenário: Edição do próprio CPF sem conflito
    Dado que o cliente "Ana Souza" possui CPF "12345678901"
    Quando o Gerente acessa a edição e salva sem alterar o CPF
    Então o sistema salva com sucesso
    E não exibe erro de duplicidade

  Cenário: Perfil sem permissão não acessa a edição
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    Quando tenta acessar a rota "/clientes/:id/editar"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/clientes/:id/editar` é protegida; perfis sem permissão são redirecionados.

## Fora de escopo

- Exclusão ou inativação de clientes (não existe deleção de cliente no escopo atual).
- Edição de clientes de outras filiais por um Gerente.
- Alteração do `branch_id` do cliente (filial de cadastro é imutável após criação).
- Histórico de alterações cadastrais do cliente.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Formulário de edição de cliente | `/clientes/:id/editar` | Alterar dados cadastrais de um cliente existente |

### Diagrama de navegação

```
/clientes (listagem — 007-03)
  └── /clientes/:id (ficha do cliente — ponto de entrada)
        └── /clientes/:id/editar (formulário de edição)
              ├── [salvar com dados válidos] → /clientes/:id (ficha atualizada)
              ├── [cancelar] → /clientes/:id
              └── [erro de validação] → permanece em /clientes/:id/editar com mensagens de erro
```

### Entrada de navegação

O acesso a `/clientes/:id/editar` se dá pelo botão "Editar" presente na ficha do cliente (`/clientes/:id`). A ficha do cliente é acessada a partir da listagem de clientes (`/clientes`).
