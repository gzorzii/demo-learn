# PDM Submete Avaliação nas 3 Dimensões + Nine Box Preview

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o PDM preencha e submeta sua avaliação formal sobre o liderado no ciclo de Performance Review, avaliando as 3 dimensões (D1, D2 e D3) com nota 1–4 e comentário obrigatório, e visualizando em tempo real o posicionamento do liderado no Nine Box conforme as notas são inseridas.

---

## Atores envolvidos

- **PDM:** único ator que preenche e submete a avaliação nas 3 dimensões no PR

---

## Regras de negócio

- (Regra 1) Avaliação em 3 dimensões com escala 1–4 e comentário obrigatório do PDM:
  - D1 — Entrega com Impacto (WHAT)
  - D2 — Conhecimento Técnico (HOW técnico)
  - D3 — Comportamentos Cultura (HOW cultural)
- (Regra 2) Nine Box: eixo Y = D1; eixo X = D2 + D3. Preview em tempo real conforme PDM insere notas.
- (Regra 1) Comentário é obrigatório para cada dimensão.
- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes; sem follow-up ativo.
- (Regra 33) IA verifica cobertura mínima de ~70% das skills/dimensões e exemplos específicos.
- Após submissão, a avaliação principal não pode ser alterada (ajustes de score são tratados em `021`).
- O PDM avalia cada liderado individualmente.
- O Nine Box preview é parte do mesmo formulário de preenchimento — não é tela separada (decisão 3 do features.md).

---

## Critérios de aceite

```gherkin
Dado que um PDM autenticado possui um liderado com PR ativo na fase de coleta
Quando o PDM acessa o formulário de avaliação desse liderado
Então visualiza 3 seções (D1, D2, D3) com campo de nota (1–4) e comentário
E visualiza o Nine Box (3x3) inicialmente vazio ou com posição neutra

Dado que o PDM insere ou altera a nota de D1 (Entrega com Impacto)
Quando a nota é inserida
Então o Nine Box preview atualiza o posicionamento no eixo Y em tempo real

Dado que o PDM insere ou altera as notas de D2 e D3 (HOW técnico e cultural)
Quando as notas são inseridas
Então o Nine Box preview atualiza o posicionamento no eixo X em tempo real (D2 + D3)

Dado que o PDM está preenchendo um comentário
E o conteúdo tem detalhes insuficientes (cobertura < 70% das dimensões)
Quando o campo perde foco ou o PDM tenta submeter
Então a IA exibe alerta inline sugerindo que a resposta seja mais específica

Dado que o PDM preencheu nota e comentário para as 3 dimensões
Quando o PDM submete a avaliação
Então o sistema registra a avaliação
E exibe confirmação de envio
E atualiza o status do PR do liderado

Dado que o PDM não preencheu nota ou comentário em alguma dimensão
Quando tenta submeter
Então o sistema exibe mensagem de erro indicando os campos obrigatórios ausentes

Dado que o PDM já submeteu a avaliação de um liderado
Quando acessa novamente o formulário
Então o sistema exibe a avaliação em modo somente leitura com o Nine Box posicionado
E indica que ajustes de score podem ser feitos em etapa posterior (021)
```

---

## Quem pode acessar

Apenas PDMs autenticados, para liderados com PR ativo na fase de coleta.

---

## Fora de escopo

- Autoavaliação do colaborador no PR (tratada em `019`)
- Ajuste de score final (±1) com justificativa — ação separada e auditável em `021`
- Submissão para calibração (tratada em `022`)
- Nine Box final decidido na calibração (tratado em `028`)
- Avaliação de convidados pares no PR

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                  | Rota                                       | Propósito                                                           |
|-----------------------|--------------------------------------------|---------------------------------------------------------------------|
| Avaliação PDM PR      | `/meu-time/:colaboradorId/pr/:id/avaliar`  | Formulário de avaliação nas 3 dimensões com Nine Box preview        |

### Diagrama de navegação

```
/meu-time  ← lista de liderados do PDM
  └── [card do liderado — PR ativo — fase: coleta] → /meu-time/:colaboradorId/pr/:id/avaliar
        ├── [avaliação não submetida] → formulário D1, D2, D3 + Nine Box preview ao lado
        │     ├── [nota inserida] → Nine Box atualizado em tempo real
        │     ├── [IA alerta — conteúdo insuficiente] → alerta inline
        │     ├── [submeter — todos campos preenchidos] → confirmação → /meu-time (status atualizado)
        │     ├── [submeter — campo faltando] → erro de validação inline
        │     └── [sair sem submeter] → rascunho mantido → /meu-time
        └── [avaliação já submetida] → modo somente leitura com Nine Box posicionado
```

### Entrada na navegação

O formulário é acessado a partir do card do liderado em `/meu-time`, disponível no menu lateral para o perfil **PDM**. A ação de avaliação aparece como pendente enquanto o PR estiver na fase de coleta.
