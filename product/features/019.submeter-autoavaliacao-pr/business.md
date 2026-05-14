# Submeter Autoavaliação nas 3 Dimensões no PR

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador preencha e submeta sua autoavaliação no ciclo de Performance Review, avaliando-se nas 3 dimensões (D1, D2 e D3) com texto e nota de 1 a 4 por dimensão. A autoavaliação é obrigatória mas não conta para a nota final.

---

## Atores envolvidos

- **Colaborador:** único ator que preenche e submete a autoavaliação no PR

---

## Regras de negócio

- (Regra 1) Avaliação estruturada em 3 dimensões com escala 1–4 e comentário:
  - D1 — Entrega com Impacto (WHAT): resultado, qualidade, consistência
  - D2 — Conhecimento Técnico (HOW): domínio técnico, diagnóstico, adoção de IA
  - D3 — Comportamentos Cultura (HOW): colaboração, proatividade, inclusão
- (Regra 3) Autoavaliação não conta para a nota final do ciclo.
- (Regra 21) PR é avaliação 360: autoavaliação é um dos componentes obrigatórios.
- (Regra 4) PR tem foco em padrões longitudinais do ciclo (diferente do CF, que foca no período recente).
- (Regra 32) IA alerta quando a resposta tem detalhes insuficientes.
- (Regra 33) IA verifica cobertura mínima de ~70% das skills/dimensões e exemplos específicos.
- O colaborador deve preencher nota (1–4) e comentário para cada uma das 3 dimensões.
- Após submissão, a autoavaliação não pode ser alterada.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um PR ativo na fase de coleta
Quando acessa o formulário de autoavaliação do PR
Então visualiza 3 seções: D1, D2 e D3
E cada seção contém campo de nota (1–4) e campo de comentário texto

Dado que o colaborador preenche nota e comentário para as 3 dimensões
Quando submete a autoavaliação
Então o sistema registra a autoavaliação
E exibe confirmação de envio
E atualiza o progresso do ciclo PR

Dado que o colaborador não preencheu nota ou comentário em alguma dimensão
Quando tenta submeter a autoavaliação
Então o sistema exibe mensagem de erro indicando os campos obrigatórios não preenchidos

Dado que o colaborador está preenchendo um comentário
E o conteúdo tem detalhes insuficientes (cobertura < 70% das dimensões)
Quando o campo perde foco ou o colaborador tenta submeter
Então a IA exibe alerta inline sugerindo que a resposta seja mais específica

Dado que o colaborador já submeteu a autoavaliação
Quando acessa novamente o formulário
Então o sistema exibe a autoavaliação em modo somente leitura
E não permite edição
```

---

## Quem pode acessar

Apenas o colaborador autenticado que é a sujeita do ciclo PR ativo, durante a fase de coleta.

---

## Fora de escopo

- Autoavaliação no CF (formulário de texto aberto sem escala — tratado em `010`)
- Avaliação do PDM sobre o liderado no PR (tratada em `020`)
- Avaliação de pares convidados no PR (não há feature separada de convidados no escopo atual)
- Edição da autoavaliação após submissão

---

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela                 | Rota                              | Propósito                                                        |
|----------------------|-----------------------------------|------------------------------------------------------------------|
| Autoavaliação PR     | `/ciclos/pr/:id/autoavaliacao`    | Formulário de autoavaliação nas 3 dimensões do ciclo PR          |

### Diagrama de navegação

```
/ciclos  (003.visao-ciclos-ativos)
  └── [PR ativo — fase: coleta] → /ciclos/pr/:id/autoavaliacao
        ├── [autoavaliação não submetida] → formulário D1, D2, D3 com nota + comentário
        │     ├── [IA alerta — conteúdo insuficiente] → alerta inline → continuar editando
        │     ├── [submeter — todos campos preenchidos] → confirmação → /ciclos/pr/:id
        │     ├── [submeter — campo faltando] → erro de validação inline
        │     └── [sair sem submeter] → rascunho mantido → /ciclos
        └── [autoavaliação já submetida] → modo somente leitura
```

### Entrada na navegação

A autoavaliação PR é acessada a partir do card do PR ativo em `/ciclos`, visível para o perfil **Colaborador**. A ação aparece como pendente quando a fase de coleta está ativa.
