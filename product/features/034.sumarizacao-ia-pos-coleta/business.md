# IA Sumariza e Analisa Respostas após Encerramento do Ciclo

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Ao encerrar um ciclo (CF ou PR), o sistema aciona automaticamente o pipeline de IA para anonimizar as respostas coletadas, sumarizá-las, compará-las com os critérios das dimensões de avaliação e verificar coerência entre notas e comentários, gerando um resumo final para revisão humana.

---

## Atores envolvidos

- **Sistema (pipeline de IA):** único ator que executa o processamento; nenhuma persona humana dispara a sumarização manualmente
- **PDM:** aprova o resumo gerado (feature separada `035`)
- **Calibrador:** aprova o resumo gerado (feature separada `035`)

---

## Regras de negócio

- (Regra 34) IA pós-coleta: anonimização das respostas; sumarização; comparação com critérios das 3 dimensões; verificação de coerência nota–comentários; histórico de até ~24 meses.
- (Regra 35) O resumo final gerado pela IA deve ter aprovação do avaliador antes do registro oficial (tratado em `035`).
- (Regra 36) IA não substitui validação humana; ONA MVP usa dados simulados (mock).
- O pipeline é acionado automaticamente ao encerrar o ciclo (CF ou PR).
- O processamento ocorre em background — o usuário não espera em tela; é notificado quando o resumo está pronto para aprovação.
- Anonimização: respostas de convidados são processadas de forma a não identificar o respondente individual no resumo gerado.
- Comparação de coerência: a IA verifica se os comentários do PDM estão alinhados com as notas atribuídas.

---

## Critérios de aceite

```gherkin
Dado que um ciclo CF foi encerrado (automaticamente ou manualmente)
Quando o sistema detecta o encerramento
Então o pipeline de IA é acionado automaticamente em background

Dado que o pipeline de IA é executado para um CF encerrado
Quando o processamento é concluído
Então o sistema gera um resumo com: sumarização das respostas dos convidados (anonimizadas), pontos de atenção e comparação com critérios das dimensões

Dado que um ciclo PR foi encerrado
Quando o pipeline de IA é executado
Então o sistema gera um resumo com: sumarização das respostas, análise de coerência nota–comentários do PDM, comparação com critérios D1/D2/D3 e contexto histórico de até ~24 meses

Dado que o pipeline de IA concluiu o processamento
Quando o resumo está disponível
Então o avaliador responsável (PDM ou Calibrador) recebe notificação para aprovar o resumo (035)

Dado que o pipeline de IA encontra menos de 3 respondentes convidados para um ciclo
Quando gera o resumo
Então as respostas individuais são anonimizadas de forma que não seja possível identificar o respondente

Dado que o pipeline de IA falha durante o processamento
Quando o erro ocorre
Então o sistema registra o erro
E notifica a equipe de suporte (ou reprocessa automaticamente após intervalo)
E o ciclo permanece encerrado — a falha na IA não bloqueia o encerramento do ciclo
```

---

## Quem pode acessar

Esta feature não tem interface de usuário para disparo — é exclusiva do sistema (pipeline de IA). A aprovação do resumo gerado é tratada em `035`.

---

## Fora de escopo

- Alerta de IA durante o preenchimento (tratados em `015` e `023`)
- Aprovação do resumo gerado (tratada em `035`)
- Integração com ONA real (fase 2 — regra 36)
- Geração de relatório PDF (tratada em `033`)

---

## Fluxo de telas

Esta feature não introduz telas próprias — é exclusivamente de backend/sistema.

O avaliador percebe o resultado do processamento por meio de:
1. Notificação recebida quando o resumo está pronto para aprovação
2. Item de aprovação pendente na tela de aprovação de resumo (`035`)

### Diagrama de navegação

```
Sistema (pipeline de IA — sem UI)
  ├── [CF encerrado] → pipeline acionado → processa respostas → gera resumo CF
  └── [PR encerrado] → pipeline acionado → processa respostas + coerência + histórico → gera resumo PR

Sistema (após processamento)
  └── → notifica PDM / Calibrador para aprovação → (035.aprovar-resumo-ia)
```

### Entrada na navegação

Nenhuma entrada no menu lateral — feature exclusiva de sistema. O resumo gerado aparece na tela de aprovação (`035`) após processamento.
