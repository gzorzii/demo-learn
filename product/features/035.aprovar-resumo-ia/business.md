# Avaliador Aprova Resumo Gerado pela IA antes do Registro

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM ou Calibrador revise o resumo gerado pela IA após o encerramento de um ciclo (CF ou PR) e aprove ou solicite revisão antes que o resumo seja registrado oficialmente, garantindo que nenhum conteúdo gerado por IA seja publicado sem validação humana.

---

## Atores envolvidos

- **PDM:** aprova resumos de CFs e PRs dos seus liderados
- **Calibrador:** aprova resumos de PRs da sessão de calibração

---

## Regras de negócio

- (Regra 35) O resumo final gerado pela IA deve ter aprovação do avaliador antes do registro oficial.
- (Regra 36) IA não substitui validação humana.
- O avaliador pode aprovar o resumo ou solicitar revisão (com comentário explicando o que deve ser ajustado).
- Se a revisão for solicitada, o pipeline de IA deve ser reprocessado ou o resumo deve ser editado manualmente (a definir — ver questões em aberto).
- Apenas após aprovação o resumo fica disponível no relatório final para o colaborador.
- A aprovação é registrada com data, hora e identidade do aprovador para auditoria.
- O avaliador pode visualizar o resumo lado a lado com as respostas originais (anonimizadas) para validação contextualizada.

---

## Critérios de aceite

```gherkin
Dado que a IA gerou um resumo de um ciclo encerrado (CF ou PR)
Quando o PDM ou Calibrador responsável recebe a notificação
Então o resumo aparece na lista de pendências de aprovação

Dado que o avaliador acessa um resumo pendente de aprovação
Quando visualiza a tela
Então pode ler o resumo gerado pela IA
E pode visualizar as respostas originais (anonimizadas) para referência

Dado que o avaliador considera o resumo adequado
Quando aciona "Aprovar"
Então o resumo é registrado oficialmente
E o resumo fica disponível no ciclo do colaborador (014 para CF, 031 para PR)
E a aprovação é registrada com data, hora e aprovador

Dado que o avaliador identifica problemas no resumo
Quando aciona "Solicitar revisão" e preenche comentário explicativo
Então o resumo não é registrado oficialmente
E o sistema registra a solicitação de revisão

Dado que um avaliador tenta aprovar o resumo de um ciclo de um colaborador que não é seu liderado (ou que não estava na sua sessão de calibração)
Quando tenta acessar
Então o sistema rejeita com mensagem de acesso negado
```

---

## Quem pode acessar

- **PDM autenticado:** aprova resumos dos ciclos (CF e PR) dos seus liderados diretos
- **Calibrador autenticado:** aprova resumos de PRs dos colaboradores da sua sessão de calibração

---

## Fora de escopo

- Geração do resumo pela IA (tratada em `034`)
- Visualização do resumo pelo colaborador (disponibilizado após aprovação via `014` ou `031`)
- Edição manual do resumo pelo avaliador (apenas aprovação ou solicitação de revisão)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                        | Rota                             | Propósito                                                            |
|-----------------------------|----------------------------------|----------------------------------------------------------------------|
| Fila de aprovação de resumos | `/aprovacoes`                   | Lista de resumos de IA pendentes de aprovação para o avaliador       |
| Detalhe da aprovação        | `/aprovacoes/:cicloId`           | Visualização do resumo gerado e ações de aprovar ou solicitar revisão|

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /aprovacoes  ← entrada pelo menu lateral (perfil PDM e Calibrador)
        ├── [lista de resumos pendentes de aprovação]
        └── [selecionar resumo pendente] → /aprovacoes/:cicloId
              ├── [visualizar resumo + respostas originais anonimizadas]
              ├── [Aprovar] → resumo registrado → notifica que está disponível → /aprovacoes
              ├── [Solicitar revisão + comentário] → revisão registrada → /aprovacoes
              └── [voltar] → /aprovacoes
```

### Entrada na navegação

A tela `/aprovacoes` é acessada pelo item "Aprovações" (ou equivalente) no menu lateral, visível para os perfis **PDM** e **Calibrador**. A feature `002.menu-navegacao` deve incluir este item na tabela de permissões. A entrada pode exibir um indicador de pendências (badge) quando houver resumos aguardando aprovação.

---

## Questões em aberto

- Quando o avaliador solicita revisão: o pipeline de IA reprocessa automaticamente ou um humano precisa intervir manualmente?
- O avaliador pode editar o texto do resumo diretamente (ao invés de apenas aprovar ou rejeitar)?
- Há prazo máximo para aprovação do resumo antes de alguma ação automática do sistema?
