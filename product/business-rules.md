# Business Rules — POC Journey (Avaliação de Desempenho)

> Fonte única de verdade para todas as regras de negócio.
> Flows e specs referenciam regras por número. Nunca duplicar o texto aqui em outros arquivos.

---

## Framework de avaliação

1. Avaliação estruturada em **3 dimensões**; escala **1–4** por dimensão + comentário obrigatório do PDM:
   - **D1 — Entrega com Impacto (WHAT):** resultado com destino claro (negócio/cliente/time); qualidade e completude; consistência (análise longitudinal)
   - **D2 — Conhecimento Técnico (HOW):** domínio técnico; diagnóstico e resolução; qualidade de execução; adoção de IA
   - **D3 — Comportamentos Cultura (HOW):** colabora e constrói com o time; proatividade e ownership; inclusão ativa
2. **Nine Box:** eixo Y = D1 (WHAT / Entrega com Impacto); eixo X = D2 + D3 (HOW / Técnico + Cultural).
3. Autoavaliação **não** conta para nota final.

---

## Ciclos e cadências

4. Dois ciclos — natureza distinta:
   - **Continuous Feedback (CF):** Feedback Recente e Correção de Rota — curto, fácil de responder, foco no período recente.
   - **Performance Review (PR):** Formal e Fundamenta Decisões de Carreira — profundo, estruturado, foco em padrões longitudinais do ciclo.
   - CF e PR **nunca correm em paralelo** para a mesma sujeita: PR só inicia após encerramento do CF aplicável.
5. **Sync (vista "roxa"):** visão conjunta CF + PR na UI; somente leitura; **não** é um terceiro tipo de ciclo.

---

## Continuous Feedback (CF)

6. CF pode ser iniciado por: **trimestral automático** (cron do sistema), **gatilho de evento** (mudança de projeto, promoção, mudança de cliente), **manual pelo PDM** para o seu liderado, ou **manual pelo próprio colaborador** (quando não houver CF/PR ativo e fora do blackout).
7. CF de sistema (cron): **cron controla todas as transições**; colaborador não pode fechar manualmente.
8. CF manual: **sujeita encerra**.
9. **Self + PDM** obrigatórios; convidados opcionais — limite de **10 convidados**.
10. **7 dias** para colaborador/PDM validarem os convidados; após esse prazo, ONA seleciona automaticamente e a coleta inicia.
11. **10 dias** para avaliadores responderem após início da coleta.
12. Encerramento do CF: após **10 dias** OU **100% das respostas obrigatórias** OU encerramento manual pela sujeita (somente CF manual).
13. **CF não tem restrição de tenure** (regra dos 6 meses aplica-se apenas ao PR).
14. **Onboarding:** coletas forçadas aos **30** e **90 dias** — gatilho independente do trimestral.
15. **Anonimização:** mínimo **3** respondentes para exibição de respostas em feedbacks pontuais.

---

## Performance Review (PR)

16. PR **anual por colaborador**. Empresa dividida em **4 grupos**; cada grupo roda o PR num quarter diferente (ex.: grupo A em janeiro, grupo B em abril).
17. Após o quarter de PR, os **3 quarters seguintes** daquele colaborador são de CF.
18. PR é **automático**; nenhuma persona pode iniciar manualmente. Pré-condições: blackout de CF ativo e **mínimo de 6 meses de empresa** da sujeita.
19. **Blackout:** mês imediatamente anterior ao PR + período do PR. Novos CFs **não** podem abrir durante o blackout; CFs já iniciados antes do blackout **podem continuar** até fechar.
20. Prazo do PR: **1 mês** para concluir todas as etapas.
21. PR é avaliação **360**: autoavaliação + pares + PDM.
22. PDM escolhe o **modelo de alocação** do liderado (Team / Staff Aug / SDLC); essa escolha define o quórum mínimo de pares.
23. **Quórum PR:** autoavaliação + PDM obrigatórios; **Team:** mínimo 5 pares; **Staff Aug / SDLC:** mínimo 1 par.
24. Se ninguém adicionar convidados e PDM não selecionar modelo → sistema adiciona **5 peers automaticamente**.
25. Limite de até **10 convidados** por ciclo PR.

---

## Calibração e devolutiva

26. **Acesso por papel (cumulativo):** BP → acesso à tela BP/Calibrator; Admin → acesso à tela Admin; usuário pode ter ambos os papéis simultaneamente.
27. **Admin — criação de ciclos:** Admin configura ciclos segmentados por critérios (role, região, senioridade); define distribuição dos grupos nos quarters de PR.
28. **Admin — agenda de calibração:** sistema filtra colaboradores com status "pronto para calibrar"; Calibrador gera agenda da sessão (quem entra, quais PDMs participam).
29. **Calibração:** sessão com PDMs + Calibrador + BP + governança; posicionamento no Nine Box revisado e desafiado entre pares; decisão final pelo Calibrador.
30. Scores decididos na calibração são o **resultado final** do ciclo PR.
31. **Devolutiva:** após calibração, PDM comunica rating final ao colaborador e conduz conversa sobre feedbacks e posicionamento.
32. **Sessão pausável:** sessão de calibração pode ser pausada a qualquer momento durante execução (`IN_PROGRESS → PAUSED`) e retomada posteriormente (`PAUSED → IN_PROGRESS`); scores parciais são preservados.
33. **Draft de item:** scores preenchidos pelo Calibrador são salvos como rascunho (`DRAFT`) até confirmação explícita; itens confirmados ficam imutáveis.
34. **Retomada:** ao retomar sessão pausada, itens confirmados permanecem travados; itens em rascunho ficam editáveis pelo Calibrador.
35. **Confirmação obrigatória:** apenas o Calibrador pode confirmar itens de calibração.
36. **Fechamento bloqueado:** sessão só pode ser fechada (`CLOSED`) quando todos os itens estão `CONFIRMED`.
37. **Visibilidade de rascunho:** participantes (PDM, BP, Governança) têm acesso somente leitura a itens em rascunho e confirmados durante a sessão.

---

## IA — papel e guardrails

38. IA no chat: **alerta quando resposta tem detalhes insuficientes**; sem follow-up ativo nem investigação conversacional.
39. IA guardrails: cobertura mínima **~70%** das skills/dimensões do papel; exemplos específicos (não genéricos).
40. IA pós-coleta: anonimização; sumarização; comparação com critérios das 3 dimensões; coerência nota–comentários; histórico de até ~24 meses.
41. **Resumo final** gerado pela IA para cada avaliador: aprovação do avaliador obrigatória antes do registro oficial.
42. IA não substitui validação humana; ONA MVP usa dados simulados (mock).

---

## ONA

43. **ONA (MVP):** apenas conceitual; sugestões de avaliadores simuladas com dados mock. Integração real (e-mail, Google Chat, Calendar) planejada para fase 2.