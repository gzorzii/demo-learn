# Remover Desconto

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Gerente remova um desconto existente na filial. A remoção é imediata: a partir do momento em que confirmada, o PDV deixa de considerar o desconto ao escanear livros afetados. Não há edição de descontos — remover e recriar é o fluxo suportado para correções.

## Atores envolvidos

- **Gerente** — remove descontos da própria filial.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Apenas Gerente e Administrador podem remover descontos.
2. Qualquer desconto pode ser removido, independente de seu status (ativo, agendado ou expirado).
3. A remoção exige confirmação explícita do usuário antes de ser efetivada (ação irreversível).
4. A remoção é imediata: o desconto deixa de ser aplicado no PDV assim que confirmada.
5. Ao remover um desconto de escopo `book`, os vínculos em `discount_book` também são removidos.
6. Não existe "desativação temporária" de desconto — a única operação disponível é a remoção definitiva.
7. Um desconto já expirado (com `ends_at` no passado) também pode ser removido da listagem.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente ou Administrador
Quando aciona "Remover" em um desconto na listagem /discounts
Então o sistema exibe uma mensagem de confirmação com o resumo do desconto (escopo, valor, período)

Dado que o usuário confirma a remoção
Quando confirma na caixa de confirmação
Então o desconto é removido do banco de dados
E os vínculos em discount_book são removidos (quando scope = book)
E a listagem /discounts é atualizada sem o item removido

Dado que o usuário cancela a remoção
Quando aciona "Cancelar" na caixa de confirmação
Então nenhuma alteração é realizada
E o usuário permanece na listagem /discounts com o desconto ainda visível

Dado que o desconto está ativo e afeta livros no PDV
Quando o Gerente confirma a remoção
Então a partir daquele momento o PDV não aplica mais o desconto nos livros previamente afetados

Dado que o desconto a ser removido possui status "Expirado"
Quando o Gerente aciona "Remover" e confirma
Então o desconto é removido normalmente, sem mensagem adicional de alerta
```

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador.

## Fora de escopo

- Desativação temporária de desconto (não existe — apenas remoção definitiva).
- Remoção em lote de múltiplos descontos simultaneamente.
- Histórico ou log de descontos removidos.
- Desfazer a remoção após confirmação.

## Fluxo de telas

### Telas introduzidas

Esta feature não introduz uma tela dedicada. A remoção é acionada diretamente na listagem de descontos (`/discounts`) via modal de confirmação inline.

| Tela | Rota | Propósito |
|---|---|---|
| Modal de confirmação de remoção | (modal em `/discounts`) | Solicitar confirmação antes de remover o desconto |

### Diagrama de navegação

```
/discounts (listagem — feature 003-02)
  └── [Remover] em item da lista
        └── modal de confirmação (inline em /discounts)
              ├── [Confirmar remoção] → desconto removido → permanece em /discounts (lista atualizada)
              └── [Cancelar] → fecha modal → permanece em /discounts sem alterações
```

### Nota de navegação

A ação de remoção não possui rota própria. O fluxo inteiro ocorre na rota `/discounts` por meio de um modal de confirmação. Não há nova entrada no menu de navegação para esta feature.
