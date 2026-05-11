# Etiquetas — Módulo 002

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pela configuração e impressão de etiquetas de preço para os livros do catálogo. As etiquetas são impressas em folhas A4 adesivas e contêm código de barras (para leitura no PDV), preço de venda e categoria. A impressão é feita em lote, a partir de uma seleção prévia na listagem de livros.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `002-01.configurar-tamanhos-etiqueta` | Definir e gerenciar os tamanhos de etiqueta disponíveis (padrões e customizados) |
| `002-02.imprimir-etiquetas` | Selecionar livros, escolher tamanho de etiqueta e acionar a impressão em lote |

## Atores envolvidos

- **Catalogador** — principal usuário do módulo; configura tamanhos e imprime etiquetas.
- **Gerente** — pode configurar e imprimir etiquetas.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Etiquetas não são impressas no momento do cadastro do livro — a impressão é sempre sob demanda, a partir da listagem.
2. Cada etiqueta contém: código de barras (para leitura no PDV), preço de venda e categoria.
3. As etiquetas são impressas em folhas A4 adesivas com tamanho configurável.
4. O sistema oferece tamanhos predefinidos (ex.: 5 cm × 10 cm, 3 cm × 5 cm) e permite que o usuário defina tamanhos customizados.
5. O usuário escolhe quantas cópias de cada etiqueta deseja imprimir.

## Quem pode acessar

Administrador, Gerente e Catalogador. Caixa não possui acesso a este módulo.

## Fora de escopo

- Impressão de etiquetas no momento do cadastro.
- Etiquetas com informações além de código de barras, preço e categoria.
- Integração com impressoras de etiqueta dedicadas (ex.: Zebra) — somente impressão em A4.
- Personalização do layout visual da etiqueta além do tamanho.
