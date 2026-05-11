# Filiais — Módulo 010

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pela gestão das unidades físicas (filiais) da livraria. Permite que o Administrador cadastre, edite e consulte filiais, incluindo a configuração do prazo de alerta de tempo em prateleira (`shelf_time_threshold`) por unidade. Toda a rastreabilidade de estoque, usuários, vendas, descontos e vouchers depende do `branch_id` como escopo primário.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `010-01.cadastrar-filial` | Registrar uma nova unidade física com nome, endereço, telefone e estado ativo |
| `010-02.editar-filial` | Alterar dados de uma filial existente, incluindo configuração do prazo de alerta de prateleira |
| `010-03.listar-filiais` | Listar todas as filiais cadastradas com status e dados resumidos |

## Atores envolvidos

- **Administrador** — único perfil com permissão de criar, editar e visualizar filiais.

## Modelo de dados relevante

As tabelas envolvidas estão definidas em `000-01.modelagem-dados`:

- `branch` — representa cada unidade física; colunas: `id`, `name`, `address`, `phone`, `active`, `created_at`, `updated_at`.
- `shelf_threshold` — configuração de prazo de prateleira por filial; colunas: `id`, `branch_id` (único), `days_threshold`, `configured_by`, `updated_at`. Essa tabela possui constraint `UNIQUE` em `branch_id`, portanto há no máximo um registro por filial.

## Regras de negócio

1. Apenas o Administrador pode criar e editar filiais.
2. Uma filial possui os atributos: nome, endereço completo, telefone e flag de ativação.
3. O nome da filial é obrigatório e deve ser único no sistema.
4. Uma filial inativa continua visível para o Administrador, mas usuários vinculados a ela não conseguem autenticar.
5. O prazo de alerta de tempo em prateleira (`days_threshold`) é configurado por filial, sem valor padrão do sistema — cada filial deve ter seu próprio valor configurado pelo Administrador (ou Gerente, via `012-xx`).
6. O `shelf_threshold` é único por filial: criar um segundo registro para a mesma filial viola a constraint de unicidade. A atualização sempre deve ser feita sobre o registro existente.
7. O `branch_id` é a chave de escopo de todos os outros módulos do sistema; remover ou desativar uma filial não exclui os dados vinculados.

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador. O módulo "Gestão de Filiais" aparece no menu de navegação lateral somente para o Administrador, conforme a tabela de permissões em `000-03.home-navegacao`.

## Fora de escopo

- Transferência de estoque entre filiais.
- Exclusão permanente de filiais (apenas desativação).
- Configuração de métodos de pagamento por filial (coberto por módulo 008).
- Gerenciamento de usuários da filial (coberto por módulo 009).
- Relatórios consolidados entre filiais (coberto por módulo 011).
