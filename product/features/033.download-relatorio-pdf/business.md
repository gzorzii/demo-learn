# Download do Relatório em PDF

**Estado da entrega:** Rascunho

---

## Nome do recurso e objetivo

Permitir que o colaborador faça download do relatório anual do PR em formato PDF, gerando um documento formatado com os scores finais, Nine Box e comentários do ciclo concluído para fins de registro pessoal.

---

## Atores envolvidos

- **Colaborador:** único ator que realiza o download do relatório em PDF

---

## Regras de negócio

- O download só está disponível para ciclos de PR com calibração concluída e devolutiva registrada (mesma pré-condição do `031`).
- O PDF é gerado com base nos dados do relatório final do PR — scores finais da calibração, posicionamento Nine Box e comentários do PDM.
- O PDF é gerado sob demanda (no momento do download) e não é pré-gerado.
- O arquivo gerado é armazenado em storage conforme política de retenção (definida com jurídico antes do lançamento — `description.md`).
- A geração do PDF considera LGPD: inclui apenas dados do próprio colaborador.

---

## Critérios de aceite

```gherkin
Dado que um colaborador autenticado possui um relatório de PR disponível (calibração concluída + devolutiva realizada)
Quando acessa a tela de resultados ou o relatório do PR
Então visualiza o botão de download de PDF

Dado que o colaborador aciona o download do PDF
Quando o PDF é gerado
Então o arquivo é disponibilizado para download no navegador
E o sistema registra a data e hora do download para auditoria

Dado que o PDF é gerado com sucesso
Quando o colaborador abre o arquivo
Então o documento contém: scores D1/D2/D3, posicionamento Nine Box, comentários do PDM, nome do colaborador e período do ciclo

Dado que o relatório do PR ainda não está disponível (devolutiva pendente)
Quando o colaborador tenta acessar o botão de download
Então o botão não é exibido ou está desabilitado com mensagem explicativa

Dado que ocorre erro na geração do PDF
Quando o colaborador aciona o download
Então o sistema exibe mensagem de erro e instrui o colaborador a tentar novamente
```

---

## Quem pode acessar

Apenas o colaborador autenticado que é a sujeita do ciclo PR, após devolutiva registrada pelo PDM como "realizada".

---

## Fora de escopo

- Download de histórico de CFs em PDF
- Exportação de resultados pelo Calibrador (tratado em `029`)
- Envio automático do PDF por e-mail
- Armazenamento ou gestão de PDFs anteriores (infraestrutura de storage)

---

## Fluxo de telas

### Telas introduzidas por esta feature

Esta feature não introduz tela nova — a ação de download é um botão disponível na tela de relatório do PR (`031`) e na tela de resultados do colaborador.

| Elemento               | Localização              | Propósito                                           |
|------------------------|--------------------------|-----------------------------------------------------|
| Botão "Baixar PDF"     | `/resultados/pr/:id`     | Acionado pelo colaborador para gerar e baixar o PDF |

### Diagrama de navegação

```
/resultados/pr/:id  (031.visualizar-relatorio-pr)
  └── [botão "Baixar PDF"] → geração do PDF → download no navegador
        └── [download concluído ou erro] → permanece em /resultados/pr/:id
```

### Entrada na navegação

A ação é contextual na tela do relatório do PR, acessível apenas para o perfil **Colaborador** após devolutiva realizada. Não há entrada nova no menu lateral.
