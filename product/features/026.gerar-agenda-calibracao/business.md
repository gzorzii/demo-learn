# Admin Gera Agenda da Sessão de Calibração

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o Admin visualize os colaboradores prontos para calibração, selecione quais entrarão em cada sessão e defina os PDMs participantes, gerando formalmente a agenda da sessão de calibração e enviando convites aos participantes.

---

## Atores envolvidos

- **Admin:** seleciona participantes e gera a agenda da sessão
- **Calibrador:** recebe convite e conduz a sessão (ator passivo nesta feature)
- **PDM:** recebe convite para participar da sessão dos seus liderados (ator passivo nesta feature)

---

## Regras de negócio

- (Regra 28) O sistema filtra colaboradores com status "pronto para calibrar"; o Admin gera a agenda da sessão (quem entra, quais PDMs participam).
- (Regra 29) Sessão com PDMs + Calibrador + BP + governança; posicionamento no Nine Box revisado entre pares.
- (Regra 26) BP pode acumular o papel de Admin; Calibrador tem acesso exclusivo ao campo de score final.
- Apenas colaboradores com status "pronto para calibrar" (submetidos pelo PDM em `022`) podem ser incluídos na agenda.
- O Admin define a composição de cada sessão: lista de colaboradores e lista de PDMs convocados.
- Ao gerar a agenda, o sistema envia convites automáticos aos PDMs e ao Calibrador.
- Uma sessão pode conter múltiplos colaboradores e seus respectivos PDMs.

---

## Critérios de aceite

```gherkin
Dado que um Admin autenticado acessa a tela de administração
Quando acessa a seção de calibração
Então visualiza a lista de colaboradores com status "pronto para calibrar"

Dado que o Admin seleciona colaboradores da lista para compor uma sessão
Quando adiciona colaboradores à sessão
Então o sistema exibe automaticamente os PDMs de cada colaborador selecionado como convocados

Dado que o Admin define os colaboradores e os PDMs da sessão
E confirma a geração da agenda
Quando a confirmação é realizada
Então o sistema cria a agenda da sessão
E envia convites ao Calibrador e a todos os PDMs convocados
E a sessão aparece com status "agendada"

Dado que o Admin tenta gerar uma sessão sem selecionar nenhum colaborador
Quando tenta confirmar
Então o sistema exibe mensagem de erro indicando que ao menos um colaborador deve ser selecionado

Dado que um colaborador foi incluído em uma sessão de calibração
Quando o Admin tenta incluir o mesmo colaborador em outra sessão
Então o sistema informa que o colaborador já está associado a uma sessão

Dado que um colaborador ainda não foi submetido para calibração pelo PDM (status diferente de "pronto para calibrar")
Quando o Admin visualiza a lista de colaboradores disponíveis para a sessão
Então esse colaborador não aparece na lista
```

---

## Quem pode acessar

Apenas usuários autenticados com o perfil **Admin**.

---

## Fora de escopo

- Criação do ciclo e configuração de quarters (tratada em `025`)
- Condução da sessão de calibração (tratada em `028`)
- Prework do PDM (tratado em `027`)
- Exportação de resultados pós-calibração (tratada em `029`)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                        | Rota                               | Propósito                                                              |
|-----------------------------|-------------------------------------|------------------------------------------------------------------------|
| Gestão de calibração        | `/admin/calibracao`                 | Lista de colaboradores prontos para calibrar e sessões agendadas       |
| Nova sessão de calibração   | `/admin/calibracao/nova-sessao`     | Formulário de composição da sessão e geração de agenda                 |

### Diagrama de navegação

```
/admin  (025.criar-ciclo-admin)
  └── /admin/calibracao  ← seção de calibração no painel admin
        ├── [lista: colaboradores prontos para calibrar]
        └── [botão "Nova sessão"] → /admin/calibracao/nova-sessao
              ├── [selecionar colaboradores da lista]
              ├── [sistema exibe PDMs convocados automaticamente]
              ├── [gerar agenda] → convites enviados → /admin/calibracao (sessão listada como "agendada")
              └── [cancelar] → /admin/calibracao
```

### Entrada na navegação

A seção de calibração é acessada a partir do painel `/admin`, disponível no menu lateral para o perfil **Admin**.
