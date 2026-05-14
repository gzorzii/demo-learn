# Menu Lateral e Controle de Acesso por Perfil

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir o menu lateral de navegação de forma dinâmica conforme o(s) perfil(is) do usuário autenticado, garantindo que cada ator acesse apenas as seções permitidas ao seu papel. É o ponto de entrada para todas as demais funcionalidades após o login.

---

## Atores envolvidos

- **Colaborador:** acessa seções de ciclos ativos, histórico e resultados
- **PDM:** acessa as mesmas seções do Colaborador + seções de gestão de time
- **Calibrador / BP:** acessa seções de calibração
- **Admin:** acessa seções de administração de ciclos
- Usuários com múltiplos perfis enxergam a união de todas as seções correspondentes

---

## Regras de negócio

- (Regra 26) Acesso é cumulativo por papel: um usuário com perfil BP e Admin enxerga ambas as seções simultaneamente.
- O menu é renderizado com base nos perfis ativos do token de autenticação — não há configuração manual pelo usuário.
- Seções não autorizadas para o perfil do usuário não são exibidas nem acessíveis por URL direta.
- Após o login, o sistema redireciona o usuário para a rota padrão do seu perfil principal.

---

## Critérios de aceite

```gherkin
Dado que um usuário autenticado possui apenas o perfil Colaborador
Quando o menu lateral é carregado
Então o menu exibe somente as seções: Meus Ciclos, Histórico e Resultados
E não exibe seções de PDM, Calibração ou Administração

Dado que um usuário autenticado possui os perfis PDM e Colaborador
Quando o menu lateral é carregado
Então o menu exibe as seções do Colaborador mais as seções de gestão de time do PDM

Dado que um usuário autenticado possui o perfil Admin
Quando o menu lateral é carregado
Então o menu exibe a seção de Administração
E não exibe seções exclusivas de Calibrador/BP (a menos que acumule o papel)

Dado que um usuário autenticado possui os perfis BP e Admin
Quando o menu lateral é carregado
Então o menu exibe tanto a seção de Calibração quanto a seção de Administração

Dado que um usuário autenticado tenta acessar diretamente uma rota não autorizada ao seu perfil
Quando a URL é digitada no navegador
Então o sistema redireciona para a página padrão do seu perfil com mensagem de acesso negado

Dado que um usuário acaba de realizar o login com sucesso
Quando a autenticação é concluída
Então o sistema redireciona para a rota padrão do perfil principal do usuário
```

---

## Quem pode acessar

Todos os usuários autenticados. O conteúdo do menu varia conforme os perfis atribuídos ao usuário no sistema de identidade.

---

## Fora de escopo

- Configuração manual de permissões pelo próprio usuário
- Solicitação de acesso a perfis adicionais via interface
- Gerenciamento de perfis e permissões (tarefa do sistema de identidade externo)
- Notificações in-app (tratadas em cada feature específica)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela            | Rota       | Propósito                                                           |
|-----------------|------------|---------------------------------------------------------------------|
| Shell principal | `/`        | Container com menu lateral e área de conteúdo principal pós-login  |

### Diagrama de navegação

```
[Login — /login] (001, já implementado)
  └── [Shell principal — /] ← ponto de entrada pós-login
        ├── Seções do Colaborador
        │     ├── /ciclos          (003 - visao-ciclos-ativos)
        │     ├── /historico       (032 - visualizar-historico-cf)
        │     └── /resultados      (031 - visualizar-relatorio-pr)
        ├── Seções do PDM (adicional ao Colaborador)
        │     └── /meu-time        (acesso aos ciclos dos liderados)
        ├── Seções do Calibrador / BP
        │     └── /calibracao      (028 - conduzir-sessao-calibracao)
        └── Seções do Admin
              └── /admin           (025 - criar-ciclo-admin)
```

### Entrada na navegação

Esta feature **é** a navegação. Todas as demais features referenciam rotas cujas entradas no menu são definidas aqui. Não há entrada externa que aponte para este componente — ele é o frame de toda a aplicação pós-login.

---

## Questões em aberto

- Qual é o perfil "principal" quando um usuário acumula múltiplos papéis? (define a rota padrão pós-login)
- Há uma rota de home/dashboard unificado ou cada perfil aterra em uma tela diferente?
