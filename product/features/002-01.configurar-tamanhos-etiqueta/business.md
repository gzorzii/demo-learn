# Configurar Tamanhos de Etiqueta

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Gerentes e Catalogadores definam os tamanhos de etiqueta disponíveis para impressão na filial. O sistema oferece tamanhos predefinidos que podem ser usados diretamente; o usuário pode também criar tamanhos customizados informando largura e altura em centímetros.

## Atores envolvidos

- **Catalogador** — visualiza, cria e gerencia tamanhos de etiqueta da filial.
- **Gerente** — mesmas ações do Catalogador.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. O sistema possui tamanhos predefinidos disponíveis para todas as filiais (ex.: 5 cm × 10 cm, 3 cm × 5 cm). Esses tamanhos têm `is_default = true` e `branch_id = null` na tabela `label_config`.
2. Cada filial pode criar tamanhos customizados adicionais (largura e altura em cm, com nome descritivo). Esses tamanhos têm `branch_id` da filial.
3. Um tamanho customizado pode ser removido, desde que não esteja em uso ativo em uma impressão em andamento. Tamanhos predefinidos não podem ser removidos.
4. O nome do tamanho é obrigatório e deve ser único dentro da filial.
5. A largura e a altura devem ser valores positivos maiores que zero.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Catalogador, Gerente ou Administrador
Quando acessa /labels/sizes
Então o sistema exibe a lista de tamanhos predefinidos e os tamanhos customizados da filial

Dado que o usuário preenche nome, largura e altura válidos
Quando aciona "Salvar" no formulário de novo tamanho
Então o sistema cria o registro de tamanho customizado vinculado à filial

Dado que o usuário tenta criar um tamanho com o mesmo nome de um tamanho já existente na filial
Quando aciona "Salvar"
Então o sistema exibe erro de validação "Já existe um tamanho com esse nome nesta filial"
E não cria o registro duplicado

Dado que o usuário aciona "Remover" em um tamanho customizado
Quando confirma a exclusão
Então o tamanho é removido da lista da filial

Dado que o usuário tenta remover um tamanho predefinido (is_default = true)
Quando aciona "Remover"
Então o sistema bloqueia a operação e exibe mensagem explicativa

Dado que o usuário informa largura ou altura igual a zero ou negativa
Quando aciona "Salvar"
Então o sistema exibe erro de validação nos campos inválidos
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador, Gerente ou Catalogador.

## Fora de escopo

- Configuração de layout visual da etiqueta (fontes, posicionamento dos elementos).
- Tamanhos globais customizados válidos para todas as filiais.
- Importação de configurações de tamanho via arquivo.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Configuração de tamanhos de etiqueta | `/labels/sizes` | Listar, criar e remover tamanhos de etiqueta da filial |

### Diagrama de navegação

```
/ (home) ou menu lateral → "Etiquetas"
  └── /labels/sizes (lista de tamanhos)
        ├── [Novo Tamanho] → modal/formulário inline de criação
        │     ├── [salvar] → permanece em /labels/sizes com novo tamanho na lista
        │     └── [cancelar] → permanece em /labels/sizes sem alterações
        └── [Remover tamanho customizado] → confirmação → permanece em /labels/sizes com item removido
```

### Nota de navegação

A entrada "Etiquetas" → "Configurar Tamanhos" está no menu de navegação lateral, visível para Administrador, Gerente e Catalogador. O acesso também pode ser feito a partir da tela de impressão (`002-02`) por um link de atalho para gerenciar tamanhos.
