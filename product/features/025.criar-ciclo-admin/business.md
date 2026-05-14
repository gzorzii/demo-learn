# Admin Cria e Configura Ciclo (Segmentação + Quarters de PR)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o Admin crie um ciclo anual de Performance Review segmentado por critérios (role, região, senioridade) e distribua os grupos de colaboradores nos quarters do ano, definindo qual grupo realizará o PR em qual período.

---

## Atores envolvidos

- **Admin:** único ator que cria e configura ciclos de PR

---

## Regras de negócio

- (Regra 16) PR anual; empresa dividida em 4 grupos; cada grupo roda o PR num quarter diferente.
- (Regra 27) Admin configura ciclos segmentados por critérios (role, região, senioridade); define distribuição dos grupos nos quarters de PR.
- (Regra 18) Pré-condição do PR: mínimo 6 meses de empresa da sujeita — o sistema filtra automaticamente ao iniciar o PR para o grupo.
- (Regra 19) Blackout: mês imediatamente anterior ao PR + período do PR; configurado pelo ciclo.
- (Regra 26) Admin pode acumular o papel de BP.
- A criação do ciclo e a distribuição nos quarters são etapas sequenciais do mesmo ato administrativo (decisão 4 do features.md).
- Ao criar o ciclo, o Admin define nome, critérios de segmentação e mapa de quarters (qual grupo roda em qual mês).
- Após salvar, o ciclo fica com status "ativo" e o sistema passa a gerenciar os PRs conforme o calendário.

---

## Critérios de aceite

```gherkin
Dado que um Admin autenticado acessa a tela de administração
Quando aciona "Criar novo ciclo"
Então visualiza o formulário com campos: nome do ciclo, critérios de segmentação e distribuição de grupos nos quarters

Dado que o Admin preenche nome do ciclo, critérios (role, região, senioridade) e distribuição de 4 grupos em 4 quarters
Quando salva o ciclo
Então o sistema cria o ciclo com status "ativo"
E exibe confirmação com resumo do ciclo criado

Dado que o Admin define critérios de segmentação
Quando acessa a distribuição nos quarters
Então o sistema exibe os colaboradores classificados de acordo com os critérios definidos
E o Admin pode ajustar a distribuição antes de salvar

Dado que o Admin não preenche todos os campos obrigatórios (nome, pelo menos 1 critério de segmentação, distribuição dos 4 quarters)
Quando tenta salvar
Então o sistema exibe mensagem de erro indicando os campos faltantes

Dado que o Admin salva o ciclo com a distribuição definida
Quando o quarter de um grupo é iniciado pelo sistema
Então apenas os colaboradores que se encaixam nos critérios daquele grupo e possuem 6+ meses de empresa recebem PR (regra 18)
```

---

## Quem pode acessar

Apenas usuários autenticados com o perfil **Admin**.

---

## Fora de escopo

- Geração da agenda de calibração (tratada em `026`)
- Configuração de ciclos de CF (CFs são iniciados automaticamente ou manualmente — não configurados pelo Admin)
- Edição de ciclos já iniciados com PRs ativos
- Exclusão de ciclos

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                     | Rota                     | Propósito                                                          |
|--------------------------|--------------------------|--------------------------------------------------------------------|
| Administração            | `/admin`                 | Painel administrativo com lista de ciclos e ações                  |
| Criar ciclo              | `/admin/ciclos/novo`     | Formulário de criação de ciclo com segmentação e distribuição      |
| Detalhe do ciclo         | `/admin/ciclos/:id`      | Visualização e monitoramento de um ciclo ativo                     |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /admin  ← entrada pelo menu lateral (perfil Admin)
        ├── [lista de ciclos ativos e histórico]
        └── [botão "Criar novo ciclo"] → /admin/ciclos/novo
              ├── [preencher nome + segmentação + quarters]
              ├── [salvar] → ciclo criado → /admin/ciclos/:id (detalhe do ciclo)
              └── [cancelar] → /admin
```

### Entrada na navegação

A tela `/admin` é acessada pelo item "Administração" no menu lateral, visível apenas para usuários com perfil **Admin**. A feature `002.menu-navegacao` deve incluir este item na tabela de permissões do menu.
