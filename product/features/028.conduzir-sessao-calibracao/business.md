# Calibrador Conduz Sessão: Nine Box, Discussão e Score Final

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Prover ao Calibrador e ao BP um dashboard de calibração onde a sessão é conduzida: visualização do posicionamento Nine Box de cada colaborador, leitura dos comentários e prework do PDM, facilitação da discussão entre PDMs presentes e definição do score final pelo Calibrador.

---

## Atores envolvidos

- **Calibrador:** conduz a sessão; único ator que pode alterar o score final e fechar a sessão
- **BP (Business Partner):** participa da sessão com visão agregada; não altera scores
- **PDM:** participa da discussão sobre seus liderados; leitura apenas na tela de calibração

---

## Regras de negócio

- (Regra 29) Sessão com PDMs + Calibrador + BP + governança; Nine Box revisado e desafiado entre pares; decisão final pelo Calibrador.
- (Regra 30) Scores decididos na calibração são o resultado final do ciclo PR.
- (Regra 26) Calibrador tem acesso exclusivo ao campo de score final; BP tem visão agregada sem poder de edição de score.
- (Regra 2) Nine Box: eixo Y = D1; eixo X = D2 + D3.
- (Regra 32) Sessão pode ser pausada a qualquer momento durante execução e retomada em outro momento; scores parciais preservados.
- (Regra 33) Scores preenchidos pelo Calibrador são salvos como rascunho (`DRAFT`) até confirmação explícita por item; itens confirmados ficam imutáveis.
- (Regra 34) Ao retomar sessão pausada, itens confirmados permanecem travados; itens em rascunho ficam editáveis.
- (Regra 35) Apenas o Calibrador pode confirmar itens.
- (Regra 36) Sessão só pode ser fechada quando todos os itens estão confirmados.
- (Regra 37) PDM, BP e Governança têm visão somente leitura de rascunhos e itens confirmados.
- O dashboard exibe para cada colaborador da sessão: posicionamento no Nine Box proposto pelo PDM, comentários por dimensão, prework do PDM e autoavaliação.
- O score final definido na sessão substitui o score proposto pelo PDM.

---

## Critérios de aceite

```gherkin
Dado que um Calibrador autenticado acessa o dashboard de calibração
E há uma sessão agendada com colaboradores
Quando abre a sessão
Então visualiza a lista de colaboradores da sessão com posicionamento Nine Box proposto pelo PDM

Dado que o Calibrador seleciona um colaborador da sessão
Quando abre o detalhe do colaborador
Então visualiza: posicionamento Nine Box, comentários D1/D2/D3 do PDM, prework do PDM e autoavaliação do colaborador

Dado que o Calibrador decide alterar o score final de um colaborador
Quando edita o campo de score final (exclusivo do Calibrador)
Então o Nine Box é atualizado para refletir o novo posicionamento
E o score final é diferenciado visualmente do score proposto pelo PDM

Dado que um BP autenticado acessa o dashboard de calibração
Quando visualiza a sessão
Então pode ver os posicionamentos e comentários de todos os colaboradores da sessão
E não possui campo editável de score final

Dado que um PDM autenticado acessa o dashboard de calibração durante a sessão
Quando visualiza os colaboradores
Então pode ver o posicionamento dos seus liderados
E não possui campo editável de score final

Dado que o Calibrador confirma os scores finais de todos os colaboradores da sessão
Quando fecha a sessão
Então os scores finais são registrados como resultado oficial do PR de cada colaborador
E a sessão é marcada como concluída
E os PDMs são notificados para conduzir as devolutivas

Dado que o Calibrador está conduzindo uma sessão em andamento
Quando pausa a sessão
Então a sessão vai para o estado PAUSED
E todos os scores em rascunho são preservados

Dado que uma sessão está pausada
Quando o Calibrador a retoma
Então a sessão volta para IN_PROGRESS
E itens confirmados permanecem travados
E itens em rascunho ficam editáveis

Dado que há itens não confirmados na sessão
Quando o Calibrador tenta fechar a sessão
Então o sistema bloqueia o fechamento
E indica quais colaboradores ainda não foram confirmados
```

---

## Quem pode acessar

- **Calibrador:** acesso completo ao dashboard, incluindo edição de scores finais e fechamento da sessão
- **BP:** acesso ao dashboard em modo de leitura/discussão (sem edição de scores)
- **PDM:** acesso restrito à visualização dos seus liderados durante a sessão (sem edição)

---

## Fora de escopo

- Geração da agenda da sessão (tratada em `026`)
- Prework do PDM (tratado em `027`)
- Exportação do resultado pós-sessão (tratada em `029`)
- Devolutiva do PDM ao colaborador (tratada em `030`)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                          | Rota                                | Propósito                                                            |
|-------------------------------|-------------------------------------|----------------------------------------------------------------------|
| Dashboard de calibração       | `/calibracao`                       | Lista de sessões e colaboradores prontos para calibrar               |
| Sessão de calibração          | `/calibracao/sessao/:id`            | Condução da sessão: Nine Box, comentários e score final              |
| Detalhe do colaborador        | `/calibracao/sessao/:id/:colaboradorId` | Visualização aprofundada de um colaborador durante a sessão      |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /calibracao  ← entrada pelo menu lateral (perfil Calibrador / BP)
        ├── [lista de sessões agendadas e concluídas]
        └── [sessão agendada/pausada] → /calibracao/sessao/:id
              ├── [lista de colaboradores: PENDING / DRAFT / CONFIRMED]
              ├── [Calibrador: pausar sessão] → status PAUSED → /calibracao
              ├── [Calibrador: retomar sessão PAUSED] → status IN_PROGRESS
              └── [selecionar colaborador] → /calibracao/sessao/:id/:colaboradorId
                    ├── [visualizar: Nine Box, comentários PDM, prework, autoavaliação]
                    ├── [Calibrador: editar score final] → salvo como DRAFT
                    ├── [Calibrador: confirmar item] → status CONFIRMED (travado)
                    └── [voltar] → /calibracao/sessao/:id
              └── [Calibrador: fechar sessão — só quando todos CONFIRMED]
                    → scores finais registrados → /calibracao
```

### Entrada na navegação

A tela `/calibracao` é acessada pelo item "Calibração" no menu lateral, visível para usuários com perfil **Calibrador** ou **BP**. A feature `002.menu-navegacao` deve incluir este item na tabela de permissões do menu.

---

## Questões em aberto

- O Calibrador precisa registrar justificativa ao alterar o score final de um colaborador (auditabilidade)?
- O PDM visualiza apenas seus liderados ou todos os colaboradores da sessão durante a condução?
