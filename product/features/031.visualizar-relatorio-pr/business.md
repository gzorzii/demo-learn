# Colaborador Visualiza Relatório Anual do PR (Scores D1/D2/D3)

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Exibir ao colaborador o relatório final do ciclo de Performance Review, com os scores definitivos por dimensão (D1, D2 e D3), posicionamento Nine Box e comentários do PDM, após a calibração e a devolutiva terem sido realizadas.

---

## Atores envolvidos

- **Colaborador:** visualiza o relatório final do seu próprio PR

---

## Regras de negócio

- (Regra 30) Scores decididos na calibração são o resultado final do ciclo PR.
- (Regra 1) Relatório apresenta as 3 dimensões: D1 (Entrega com Impacto), D2 (Conhecimento Técnico), D3 (Comportamentos Cultura), com escala 1–4.
- (Regra 2) Nine Box: eixo Y = D1; eixo X = D2 + D3.
- (Regra 31) O acesso ao relatório é liberado após a devolutiva ser registrada pelo PDM (`030`).
- O relatório é somente leitura — o colaborador não pode editar nenhum campo.
- O relatório exibe os scores finais da calibração (não os scores intermediários do PDM antes da calibração).

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um PR com calibração concluída
E a devolutiva foi registrada pelo PDM como "realizada"
Quando o colaborador acessa o relatório do PR
Então visualiza os scores finais D1, D2 e D3 (escala 1–4)
E visualiza o posicionamento no Nine Box

Dado que o colaborador acessa o relatório
Quando visualiza cada dimensão
Então pode ver o score final e o comentário do PDM para cada dimensão

Dado que a devolutiva ainda não foi registrada pelo PDM
Quando o colaborador tenta acessar o relatório do PR
Então o sistema informa que o relatório estará disponível após a devolutiva ser conduzida

Dado que o colaborador acessa o relatório
Quando tenta editar qualquer campo
Então o sistema não oferece opção de edição — tela é somente leitura
```

---

## Quem pode acessar

Apenas o colaborador autenticado que é a sujeita do ciclo PR, após a devolutiva ter sido registrada pelo PDM como "realizada".

---

## Fora de escopo

- Histórico de CFs anteriores (tratado em `032`)
- Download do relatório em PDF (tratado em `033`)
- Visualização do relatório pelo PDM (o PDM visualiza o ciclo por sua própria tela de gestão de time)
- Contestação ou recurso do score pelo colaborador (não previsto no MVP)

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                 | Rota                         | Propósito                                                       |
|----------------------|------------------------------|-----------------------------------------------------------------|
| Relatório do PR      | `/resultados/pr/:id`         | Visualização do relatório final do PR com scores e Nine Box     |

### Diagrama de navegação

```
/  (Shell principal — 002.menu-navegacao)
  └── /resultados  ← entrada pelo menu lateral (perfil Colaborador)
        └── [PR concluído com devolutiva realizada] → /resultados/pr/:id
              ├── [visualizar scores D1/D2/D3 + Nine Box + comentários PDM]
              ├── [ação: baixar PDF] → (033.download-relatorio-pdf)
              └── [voltar] → /resultados
```

### Entrada na navegação

A tela `/resultados` é acessada pelo item "Resultados" (ou equivalente) no menu lateral, visível para o perfil **Colaborador**. O relatório específico do PR é acessado ao clicar no ciclo PR concluído dentro dessa tela.
