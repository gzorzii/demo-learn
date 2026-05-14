# Flows — POC Journey (Avaliação de Desempenho)

> Jornadas por ator. Descreve o que cada perfil vê e faz no sistema.
> Sem regras de negócio, sem specs de implementação.
> Decisões em aberto marcadas com TBD.

---

## Auth

1. Usuário acessa a aplicação e faz login
2. Sistema identifica o(s) perfil(is) do usuário (Colaborador, PDM, Calibrador, Admin)
3. Menu lateral exibido conforme perfis ativos:
   - Colaborador: menu padrão do colaborador
   - PDM: menu padrão + dropdown com features de PDM
   - Calibrador/BP: acesso à tela de calibração
   - Admin: acesso à tela de administração
4. Usuário com múltiplos perfis acessa todas as telas correspondentes

---

## Colaborador (CI&T)

### Continuous Feedback

1. Recebe notificação que um ciclo de CF foi iniciado (automático, por evento ou manual)
2. Acessa o ciclo e visualiza estágios e status atual
3. Revisa lista de avaliadores sugeridos pelo ONA
4. Adiciona ou remove avaliadores (respeitando limite de 10); tem 7 dias para validar
5. Submete autoavaliação (texto aberto)
6. Acompanha progresso das respostas durante os 10 dias de coleta
7. Recebe resumo quando o ciclo encerra (visibilidade de respostas: TBD)
8. Colaborador com CF manual pode encerrar o ciclo manualmente

### Performance Review

1. Recebe notificação que um ciclo de PR foi iniciado para o seu grupo
2. Visualiza estágios e status do ciclo (prazo de 1 mês)
3. Revisa lista de avaliadores sugeridos; valida ou ajusta (até 10 convidados)
4. Submete autoavaliação nas 3 dimensões (texto + nota 1–4 por dimensão)
5. Aguarda respostas dos pares e avaliação do PDM
6. Após calibração, recebe relatório final com scores por dimensão
7. Acessa histórico de CFs anteriores no relatório

### Resultados e histórico

1. Acessa tela de resultados
2. Visualiza relatório anual do PR (scores D1/D2/D3)
3. Visualiza histórico de Continuous Feedbacks anteriores
4. Faz download do relatório em PDF

---

## PDM (People Development Manager)

### Continuous Feedback — gestão do time

1. Recebe notificação que ciclos de CF iniciaram para seus liderados
2. Acessa My Team e visualiza status de cada liderado no ciclo
3. Para cada liderado: revisa e opcionalmente adiciona pessoas à lista de avaliadores
4. Submete avaliação do liderado (texto: Resultado, Prontidão e Action)
5. Recebe sumário de respostas do liderado + respostas na íntegra após encerramento
6. PDM pode iniciar CF manual para um liderado específico fora do ciclo automático

### Performance Review — avaliação

1. Recebe notificação que ciclos de PR iniciaram para seus liderados
2. Acessa My Team; visualiza status de cada liderado
3. Para cada liderado:
   a. Escolhe modelo de alocação (Team / Staff Aug / SDLC) — define quórum mínimo de pares
   b. Revisa e valida lista de avaliadores
   c. Submete avaliação nas 3 dimensões (texto + nota 1–4 por dimensão)
   d. IA alerta se detalhes forem insuficientes; PDM pode revisar antes de confirmar
   e. Visualiza Nine Box preview em tempo real com base nas notas inseridas
   f. Ajusta score final (±1) com justificativa em texto livre
   g. Submete para calibração

### Performance Review — prework e calibração

1. Escreve contexto/sumário de cada liderado (~2 semanas antes da sessão de calibração)
2. Recebe convite do sistema para a sessão de calibração
3. Participa da sessão: discute posicionamento no Nine Box dos seus liderados
4. Após calibração: conduz devolutiva individual com cada liderado (rating final + feedbacks)

---

## Calibrador / Business Partner (BP)

### Sessão de calibração

1. Recebe agenda da sessão gerada pelo sistema (colaboradores prontos para calibrar)
2. Abre dashboard de calibração; visualiza lista de colaboradores na sessão
3. Para cada colaborador:
   a. Visualiza posicionamento no Nine Box proposto pelo PDM
   b. Lê comentários e Final Report do PDM
   c. Facilita discussão entre os PDMs presentes
   d. Define score final (campo editável exclusivo do Calibrador)
4. Exporta resultado pós-calibração
5. Fecha a sessão de calibração

---

## Admin

### Gestão de ciclos

1. Acessa tela de administração
2. Cria ciclo segmentado por critérios (role, região, senioridade)
3. Distribui colaboradores do ciclo nos quarters de PR (define qual grupo roda em qual quarter)
4. Monitora status dos ciclos ativos

### Agenda de calibração

1. Visualiza colaboradores com status "pronto para calibrar"
2. Seleciona colaboradores para compor a sessão
3. Define quais PDMs participam da sessão
4. Gera agenda da sessão de calibração
5. Sistema envia convites aos participantes