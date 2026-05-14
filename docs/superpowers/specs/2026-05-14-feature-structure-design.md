# Feature Structure Design

**Date:** 2026-05-14
**Status:** Approved

## Problema

O po-decomposer organizava features em módulos hierárquicos (`NNN-00.modulo / NNN-01.sub-feature`). Isso cria dois problemas:
1. Numeração reinicia por módulo → agente não sabe ordem global de implementação
2. Hierarquia desnecessária → AI precisa traversar 2 níveis para encontrar features

## Solução

Estrutura plana com numeração global sequencial. Agrupamento por domínio existe apenas no `features.md` (texto), não em pastas.

## Estrutura de pastas

```
product/features/
  001.login/
      business.md
      backend.md
      frontend.md
  002.menu-navegacao/
      business.md
      backend.md
      frontend.md
  003.iniciar-ciclo-cf/
      business.md
      backend.md
      frontend.md
  004.validar-avaliadores-cf/
      ...
```

### Regras de nomenclatura

- Padrão: `NNN.slug-em-pt-br` — 3 dígitos, kebab-case, português obrigatório
- NNN é global e sequencial, nunca reinicia (001, 002, 003...)
- Sem pasta-módulo, sem sub-hierarquia
- Slug = ação atômica (`iniciar-ciclo-cf`, não `ciclo-cf`)

## features.md

Arquivo em `product/features.md`. Agrupa features por domínio para leitura humana; números são globais e definem ordem de implementação.

```markdown
# Feature Map — POC Journey
**Generated:** YYYY-MM-DD

## Auth
- `001` login — autenticação via SSO — atores: todos **[exists|new]**
- `002` menu-navegacao — sidebar dinâmico por perfil — atores: todos **[exists|new]**

## Continuous Feedback
- `003` iniciar-ciclo-cf — Admin cria e dispara ciclo CF — atores: Admin **[new]**
- `004` validar-avaliadores-cf — Colaborador revisa lista ONA — atores: Colaborador **[new]**
...
```

- Seção markdown = domínio (Auth, CF, PR, Calibração, Admin)
- Número global = ordem de implementação (agente lê topo-a-baixo)
- `[exists]` / `[new]` markers para idempotência do po-decomposer

## Granularidade das features

**Regra central:** 1 feature = 1 ação de negócio = ~1 endpoint principal + ~1 tela.

### Critério de corte (divide quando...)
- Mais de 1 fluxo principal de ator
- Mais de 2 endpoints HTTP principais
- Telas distintas com propósitos diferentes

### Critério de merge (une quando...)
- Feature sem tela própria (não tem valor independente)
- Feature só faz sentido como passo de outra

### Exemplos
| ❌ Muito grande | ✅ Correto |
|----------------|-----------|
| `ciclo-cf` | `iniciar-ciclo-cf`, `encerrar-ciclo-cf`, `monitorar-ciclo-cf` |
| `avaliacao-pdm` | `avaliar-liderado-cf`, `avaliar-liderado-pr`, `ajustar-score-pr` |
| `calibracao` | `visualizar-nine-box`, `definir-score-calibrado`, `fechar-sessao` |

## Protocolo de navegação dos agentes

### po-decomposer
1. Lê `product/flows.md` → identifica ações atômicas por ator
2. Ordena por sequência de implementação (não por ator)
3. Gera `product/features.md` com números globais
4. Aguarda aprovação do usuário
5. Cria `product/features/NNN.slug/business.md` para features `[new]`

### tech-lead
1. Recebe `NNN.slug` como alvo
2. Lê `product/features/NNN.slug/business.md`
3. Escaneia `backend.md` das features anteriores (contexto de rotas/tabelas existentes)
4. Gera `backend.md` + `frontend.md` na mesma pasta

### backend-developer / frontend-developer
1. Recebe `NNN.slug` como alvo
2. Lê `business.md` + `backend.md` (ou `frontend.md`)
3. Implementa — sem precisar escanear outras pastas

### Descoberta de contexto
- `product/features.md` é o índice — agente lê para ver o que já existe
- `backend.md` das features anteriores para checar rotas/tabelas já definidas
- Agente nunca precisa varrer todas as pastas de features

## Impacto nos agentes existentes

| Agente | Mudança |
|--------|---------|
| po-decomposer | Remover regras de módulo (`NNN-00`); usar `NNN.slug` plano |
| tech-lead | Nenhuma — já lê pasta da feature alvo |
| backend-developer | Nenhuma — já lê arquivos da feature alvo |
| frontend-developer | Nenhuma — já lê arquivos da feature alvo |