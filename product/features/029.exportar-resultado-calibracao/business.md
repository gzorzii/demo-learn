# Calibrador Exporta Resultado Pós-Calibração

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o Calibrador exporte os resultados de uma sessão de calibração concluída, gerando um arquivo consolidado com os scores finais de todos os colaboradores da sessão para fins de registro, compartilhamento e devolutiva.

---

## Atores envolvidos

- **Calibrador:** único ator que exporta os resultados da sessão de calibração

---

## Regras de negócio

- (Regra 30) Scores decididos na calibração são o resultado final do ciclo PR — a exportação reflete esses dados.
- A exportação só pode ocorrer após a sessão de calibração ser concluída (status "concluída").
- O arquivo exportado deve conter: nome do colaborador, scores finais D1/D2/D3, posicionamento Nine Box e PDM responsável.
- A exportação é de uma sessão específica — não agrega múltiplas sessões automaticamente.
- Os dados exportados refletem o estado final após a calibração (scores do Calibrador, não os scores originais do PDM).

---

## Critérios de aceite

```gherkin
Dado que um Calibrador autenticado acessa uma sessão de calibração com status "concluída"
Quando acessa a opção de exportar
Então visualiza o botão de exportação disponível

Dado que o Calibrador aciona a exportação
Quando a exportação é processada
Então o sistema gera o arquivo com scores finais D1/D2/D3, Nine Box e PDM de cada colaborador da sessão
E disponibiliza o download do arquivo

Dado que uma sessão de calibração ainda não foi concluída (status diferente de "concluída")
Quando o Calibrador tenta exportar
Então o sistema exibe mensagem informando que a exportação só está disponível após o fechamento da sessão

Dado que o arquivo é gerado
Quando o Calibrador realiza o download
Então o sistema registra a data e hora da exportação para auditoria
```

---

## Quem pode acessar

Apenas usuários autenticados com o perfil **Calibrador**, para sessões com status "concluída".

---

## Fora de escopo

- Condução da sessão de calibração (tratada em `028`)
- Download do relatório individual do colaborador em PDF (tratado em `033`)
- Exportação de dados históricos agregados de múltiplos ciclos
- Envio automático por e-mail do resultado exportado

---

## Fluxo de telas

### Telas introduzidas por esta feature

Esta feature não introduz tela nova — a ação de exportação é um botão disponível na tela da sessão de calibração concluída (`028`), em `/calibracao/sessao/:id`.

| Elemento                | Localização                    | Propósito                                              |
|-------------------------|--------------------------------|--------------------------------------------------------|
| Botão "Exportar"        | `/calibracao/sessao/:id`       | Disponível apenas para sessões com status "concluída"  |

### Diagrama de navegação

```
/calibracao  (028.conduzir-sessao-calibracao)
  └── [sessão com status "concluída"] → /calibracao/sessao/:id
        └── [botão "Exportar resultado"] → geração do arquivo → download disponível
              └── [download concluído] → permanece em /calibracao/sessao/:id
```

### Entrada na navegação

A ação é contextual na tela da sessão concluída, acessível apenas para o perfil **Calibrador**. Não há entrada nova no menu lateral.
