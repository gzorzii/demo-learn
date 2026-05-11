# Imprimir Etiquetas

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Catalogadores e Gerentes selecionem livros na listagem do catálogo e gerem um PDF de etiquetas para impressão em folha A4 adesiva. O usuário escolhe o tamanho de etiqueta configurado para a filial, define a quantidade de cópias por livro e o PDF é gerado diretamente no navegador — sem chamada ao backend para geração do documento. Cada etiqueta contém código de barras, preço de venda e categoria do livro.

## Atores envolvidos

- **Catalogador** — principal usuário; seleciona livros, configura e imprime etiquetas.
- **Gerente** — mesmas ações do Catalogador.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. A impressão de etiquetas nunca ocorre no momento do cadastro do livro — o usuário parte sempre da listagem de livros (`/books`) com livros previamente selecionados.
2. A tela de impressão recebe obrigatoriamente ao menos um ID de livro via parâmetro de URL (`?books=id1,id2,...`). Sem IDs, a tela exibe um aviso e não permite prosseguir.
3. O usuário deve selecionar um tamanho de etiqueta antes de gerar o PDF. Apenas tamanhos cadastrados para a filial (predefinidos ou customizados) estão disponíveis — ver `002-01.configurar-tamanhos-etiqueta`.
4. Para cada livro selecionado, o usuário define quantas cópias de etiqueta deseja imprimir (mínimo 1, sem limite máximo definido).
5. Cada etiqueta contém exatamente: código de barras (gerado a partir do ISBN do livro), preço de venda atual e categoria.
6. O PDF é gerado inteiramente no frontend (JavaScript puro, sem chamada ao backend). O backend fornece apenas os dados dos livros (título, ISBN, preço de venda, categoria) necessários para montar a etiqueta.
7. O layout das etiquetas respeita o tamanho selecionado e distribui as etiquetas na página A4 de forma a aproveitar o espaço disponível (múltiplas etiquetas por linha e por coluna, conforme o tamanho escolhido).
8. Após a geração, o PDF é aberto no navegador para impressão direta ou download — o sistema não envia o arquivo para nenhum destino externo.
9. O preço utilizado na etiqueta é o preço de venda vigente no momento da geração do PDF. Descontos ativos não alteram o preço exibido na etiqueta.
10. O usuário pode retornar à listagem para ajustar a seleção de livros sem perder o tamanho de etiqueta escolhido (estado preservado enquanto na mesma sessão de navegação).

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Catalogador, Gerente ou Administrador
E selecionou ao menos um livro na listagem /books
Quando aciona "Imprimir Etiquetas"
Então é redirecionado para /labels/print?books=id1,id2,...
E a tela exibe a lista dos livros selecionados com campo de quantidade de cópias para cada um

Dado que o usuário acessa /labels/print sem parâmetros de livros na URL
Quando a tela é carregada
Então o sistema exibe um aviso informando que nenhum livro foi selecionado
E desabilita o botão de geração de PDF

Dado que a tela /labels/print foi carregada com IDs de livros válidos
Quando o sistema busca os dados dos livros no backend
Então exibe título, ISBN, preço de venda e categoria de cada livro selecionado

Dado que o usuário não selecionou um tamanho de etiqueta
Quando aciona "Gerar PDF"
Então o sistema exibe mensagem de validação solicitando a seleção de um tamanho
E não inicia a geração do PDF

Dado que o usuário selecionou um tamanho de etiqueta e informou a quantidade de cópias de cada livro
Quando aciona "Gerar PDF"
Então o frontend gera o PDF sem nenhuma chamada ao backend para geração do documento
E o PDF é aberto no navegador contendo as etiquetas no tamanho configurado

Dado que o PDF foi gerado com sucesso
Quando o usuário visualiza o documento
Então cada etiqueta contém exatamente: código de barras (gerado a partir do ISBN), preço de venda e categoria
E as etiquetas estão distribuídas na página A4 conforme o tamanho selecionado

Dado que o usuário informa quantidade de cópias igual a zero ou valor inválido para algum livro
Quando aciona "Gerar PDF"
Então o sistema exibe erro de validação no campo correspondente
E não gera o PDF

Dado que o usuário aciona "Configurar Tamanhos"
Quando a ação é executada
Então é redirecionado para /labels/sizes (002-01) para gerenciar tamanhos disponíveis
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador, Gerente ou Catalogador. Caixa não possui acesso a esta tela.

## Fora de escopo

- Geração do PDF no backend.
- Personalização do layout visual da etiqueta (fonte, posicionamento dos elementos internos).
- Impressão de etiquetas em formatos diferentes de A4 (ex.: impressoras de etiqueta dedicadas como Zebra).
- Inclusão de informações além de código de barras, preço de venda e categoria na etiqueta.
- Histórico de impressões realizadas.
- Agendamento ou impressão automática de etiquetas.
- Aplicação de descontos ativos no preço exibido na etiqueta.
- Salvar ou reutilizar configurações de impressão entre sessões.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Configuração e geração de etiquetas | `/labels/print` | Configurar tamanho, definir cópias por livro e gerar PDF de etiquetas |

### Diagrama de navegação

```
/books (001-03 — listagem de livros)
  └── [selecionar livros + "Imprimir Etiquetas"]
        └── /labels/print?books=id1,id2,... (configuração de impressão)
              ├── [selecionar tamanho] → dropdown com tamanhos da filial (inline, mesma tela)
              ├── [ajustar cópias por livro] → campos numéricos inline (mesma tela)
              ├── [Gerar PDF] → PDF aberto no navegador para impressão/download
              │     └── [imprimir / fechar] → retorna a /labels/print
              ├── [Configurar Tamanhos] → /labels/sizes (002-01)
              │     └── [retornar] → /labels/print (estado de seleção preservado)
              └── [Cancelar / Voltar] → /books
```

### Nota de navegação

A entrada "Etiquetas" → "Imprimir Etiquetas" está disponível no menu de navegação lateral para Administrador, Gerente e Catalogador. O acesso principal, porém, é sempre a partir da ação "Imprimir Etiquetas" na listagem `/books` com livros previamente selecionados. A tela `/labels/print` também exibe um link de atalho para `/labels/sizes` (`002-01`) para que o usuário possa criar ou ajustar tamanhos sem abandonar o fluxo de impressão.
