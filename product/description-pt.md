# Sistema de Gestão de Livraria e Sebo

**Versão:** 2026-05-05
**Estado:** Em refinamento

## Objetivo

Sistema de gestão web para livrarias e sebos. Permite que a equipe cadastre livros com imagens, gerencie estoque por filial, imprima etiquetas de preço, opere um ponto de venda com descontos flexíveis, emita vouchers de troca, compre livros usados, acompanhe listas de interesse de clientes, pesquise disponibilidade de livros, monitore tempo em prateleira e gere relatórios de vendas e estoque. Suporta operações multi-filial com controle de acesso baseado em perfil e é projetado para suportar emissão de nota fiscal (NF-e) no futuro.

## Atores e perfis

| Perfil | Escopo | Responsabilidades |
| --- | --- | --- |
| Administrador | Todas as filiais | Acesso total ao sistema; gerencia filiais e todos os usuários |
| Gerente | Própria filial | Cria usuários; gerencia descontos e formas de pagamento; avalia e compra lotes de livros usados; emite vouchers de troca; cadastra clientes; gera relatórios; recebe notificações de chegada de livros |
| Catálogo | Própria filial | Cadastra e edita livros; adiciona/remove imagens de livros; imprime etiquetas |
| Caixa | Própria filial | Opera o PDV; finaliza vendas; aplica vouchers e descontos; recebe notificações de chegada de livros |

**Observação:** Um único usuário pode ter múltiplos perfis (ex.: Catálogo + Caixa). Qualquer usuário pode adicionar ou remover imagens dos cadastros de livros.

## Regras de negócio

### Cadastro de livros

1. Cada cadastro de livro armazena: título, autor, ISBN, editora, ano, gênero/categoria, estado de conservação (novo/usado), descrição, preço de venda e até 10 imagens.
2. O campo de descrição do estado de conservação é obrigatório para livros usados e registra danos visíveis (marcas de caneta/lápis, páginas faltando, capa rasgada, etc.).
3. Livros novos compartilham um único cadastro por título; o estoque é controlado por quantidade.
4. Cada livro usado recebe um registro de cadastro individual.
5. Ao cadastrar um livro por ISBN, o sistema busca registros existentes e pré-preenche os campos base (título, autor, editora, ano, gênero) — mas sempre cria um registro novo e independente.
6. O preço de venda é definido manualmente por livro pelo Gerente.
7. O estoque é gerenciado por filial; não há compartilhamento de estoque entre filiais.

### Etiquetas

8. As etiquetas são impressas em folhas adesivas A4 com tamanhos configuráveis (ex.: 5 cm × 10 cm, 3 cm × 5 cm); padrões predefinidos estão disponíveis e o usuário pode definir tamanhos personalizados.
9. Cada etiqueta contém: código de barras (para leitura no PDV), preço de venda e categoria.
10. As etiquetas não são impressas no momento do cadastro. O usuário seleciona os livros em um relatório pós-cadastro e imprime em lote, na quantidade desejada.

### Descontos

11. Somente o Gerente pode criar e gerenciar descontos.
12. Um desconto possui um escopo escolhido no momento da criação: seleção individual de livros, categoria, autor ou faixa de preço (ex.: livros com preço entre R$X e R$Y).
13. O valor do desconto pode ser percentual (%) ou valor monetário fixo (R$).
14. Cada desconto possui um intervalo de data e hora opcional (data/hora de início → data/hora de fim).
15. Um livro pode ter apenas um desconto ativo por vez. Se um livro já possui desconto ativo, não pode receber outro até que o primeiro expire ou seja removido.
16. No PDV, o sistema exibe tanto o preço original quanto o preço com desconto.

### PDV / Vendas

17. Uma venda pode conter múltiplos livros e múltiplas formas de pagamento simultaneamente.
18. Um cupom impresso é emitido opcionalmente por venda — sem entrega digital.
19. O PDV recebe entrada de código de barras via leitor; o sistema recupera as informações do livro e deduz o estoque automaticamente ao concluir a venda.

### Vouchers (crédito em loja por troca)

20. Somente o Gerente avalia livros usados trazidos pelos clientes e emite um voucher com o valor de crédito acordado.
21. Os vouchers são vinculados a um cliente cadastrado específico.
22. Vouchers não têm prazo de validade e podem ser usados parcialmente (o saldo restante é preservado para compras futuras).

### Compra de livros usados (dinheiro/PIX)

23. Somente o Gerente registra a compra de um lote de livros usados.
24. Um lote recebe um preço total de compra acordado com o cliente; o pagamento é feito em dinheiro ou PIX.
25. Nenhum documento é gerado para o cliente ao vender livros.
26. A compra é registrada no sistema como uma entrada de aquisição de estoque.
27. Após a aquisição do lote, cada livro do lote é cadastrado individualmente como um novo registro de livro.

### Clientes

28. O cadastro de clientes inclui: nome, telefone, endereço e CPF ou CNPJ (coletados para futura emissão de NF-e).
29. Um cliente pode expressar interesse em múltiplos livros que não estão em estoque no momento (lista de interesse).
30. Quando um livro da lista de interesse de um cliente é cadastrado no sistema, uma notificação interna é disparada para os perfis Gerente e Caixa daquela filial, visível no canto superior direito da tela. As notificações podem ser dispensadas/marcadas como lidas.

### Usuários e acessos

31. Somente o Gerente cria novos usuários do sistema para sua filial; somente o Administrador pode gerenciar usuários em todas as filiais.
32. Somente o Administrador cria e gerencia filiais.
33. Os perfis são fixos (Administrador, Gerente, Catálogo, Caixa) — não é possível criar perfis personalizados.
34. Um único usuário pode ter múltiplos perfis simultaneamente.
35. Os usuários pertencem a uma filial específica (exceto o Administrador, que tem acesso entre filiais).

### Tempo em prateleira

1. Cada cadastro de livro possui um contador independente de tempo em prateleira que inicia na data do cadastro e é zerado a cada novo cadastro (inclusive para o mesmo título).
2. Gerente e Administrador configuram o limite de vencimento por filial (sem padrão do sistema).
3. Quando um livro ultrapassa o limite configurado, uma notificação interna é enviada ao Gerente daquela filial.
4. Uma tela dedicada lista todos os livros que atualmente excedem o limite, com informações relevantes e dias em estoque.
5. Descontos ativos não pausam o contador de tempo em prateleira.

### Histórico de preços

1. Toda alteração de preço de venda em um cadastro de livro é registrada automaticamente com: data/hora, preço anterior, novo preço e o usuário que realizou a alteração.
2. O histórico de preços é acessível apenas pelos perfis Gerente e Administrador.
3. Um relatório dedicado permite filtrar por título ou autor do livro, combinado com um filtro de período de datas.
4. A busca por título ou autor exibe alterações de preço em todos os cadastros de livros com aquele nome — útil para comparar padrões de precificação entre múltiplas entradas de livros usados.

### Pesquisa de livros

1. Qualquer perfil pode pesquisar o catálogo de livros da filial atual por título, autor ou ISBN.
2. Os resultados da pesquisa exibem uma lista com informações relevantes do livro (título, autor, categoria, estado de conservação, preço, quantidade em estoque).
3. Ao abrir um resultado, é exibido o cadastro completo do livro, incluindo fotos (para mostrar aos clientes) e a categoria/seção onde o livro está fisicamente localizado.
4. O Administrador pesquisando no contexto administrativo visualiza a filial em que está logado; pode trocar de filial para pesquisar outros locais.

### Relatórios

1. O Gerente pode visualizar e gerar relatórios apenas da sua própria filial. O Administrador pode gerar relatórios consolidados de todas as filiais.
2. Todos os relatórios podem ser exportados para Excel.

## Restrições e premissas

- Sistema web (navegador); sem aplicativo mobile ou cliente desktop.
- Sem portal para clientes; sistema exclusivo para a equipe.
- Sem devolução de livros — uma vez vendida, a venda é definitiva.
- Sem modelo de consignação.
- Sem programa de fidelidade/pontos.
- Sem emissão de nota fiscal (NF-e/NFC-e) no escopo atual — CPF/CNPJ do cliente é coletado para integração futura.
- A impressão de cupons é exclusivamente física; sem entrega por e-mail ou mensagem.
- A consulta por ISBN utiliza o banco de dados interno do próprio sistema (sem integração com API externa).
- A impressão de etiquetas requer impressora física compatível com folhas adesivas A4.

## Funcionalidades de alto nível

1. **Cadastro de Livros** — cadastro de livros novos e usados com metadados completos, descrição do estado de conservação, preço de venda, categoria e até 10 imagens; consulta por ISBN pré-preenche os campos base a partir de registros existentes.
2. **Gestão de Estoque** — inventário por filial; controle de quantidade para livros novos; registros individuais para exemplares usados.
3. **Configuração e Impressão de Etiquetas** — tamanhos de etiqueta A4 configuráveis (padrões + personalizado); seleção em lote e impressão a partir de relatório pós-cadastro; código de barras + preço + categoria em cada etiqueta.
4. **PDV** — entrada por leitor de código de barras; carrinho multi-item; checkout com múltiplas formas de pagamento; exibição de desconto (preço original + preço com desconto); resgate de voucher (parcial); dedução automática de estoque; cupom impresso opcional.
5. **Gestão de Descontos** — descontos criados pelo gerente com escopo por livro individual, categoria, autor ou faixa de preço; valor percentual ou fixo; intervalo de data/hora; um desconto ativo por livro aplicado.
6. **Sistema de Vouchers** — vouchers de troca emitidos pelo gerente vinculados a clientes; sem prazo de validade; resgate parcial com preservação do saldo; aplicável no PDV.
7. **Compra de Livros Usados** — gerente registra compra de lote com valor total; pagamento em dinheiro ou PIX; registrado como aquisição de estoque; livros cadastrados individualmente após a compra.
8. **Gestão de Clientes** — cadastro de clientes com dados de contato e CPF/CNPJ; lista de interesse multi-livro por cliente; notificações internas de chegada para Gerente e Caixa.
9. **Gestão de Formas de Pagamento** — gerente configura as formas de pagamento disponíveis no checkout.
10. **Gestão de Usuários e Acessos** — perfis fixos (Administrador, Gerente, Catálogo, Caixa); múltiplos perfis por usuário; gerente administra usuários da própria filial; administrador administra todos.
11. **Gestão de Filiais** — administrador cria e gerencia filiais; estoque e usuários são escopados por filial.
12. **Relatórios** — vendas por período, por hora, por dia da semana; livros mais vendidos; alerta de estoque baixo para livros novos; vouchers emitidos; histórico de preços por livro/autor; por filial (Gerente) ou consolidado (Administrador); exportação para Excel.
13. **Tempo em Prateleira** — contador por cadastro com limite configurável por filial; notificação ao gerente ao ultrapassar limite; tela dedicada com lista de livros vencidos e dias em estoque.
14. **Pesquisa de Livros** — busca por título, autor ou ISBN no catálogo da filial; exibição de fotos e localização física para consulta ao cliente; Administrador pode alternar entre filiais para pesquisar.

## Fora do escopo do produto

- Devolução de livros ou processamento de reembolsos.
- Portal para clientes ou interface de autoatendimento.
- Entrega digital de cupons (e-mail, WhatsApp, SMS).
- Criação de perfis personalizados/dinâmicos.
- Emissão de nota fiscal eletrônica (NF-e, NFC-e) — previsto para versão futura.
- E-commerce ou canal de vendas online.
- Gestão de fornecedores ou pedidos de compra.
- Modelo de consignação.
- Programa de fidelidade/pontos para clientes.
- Integração com API externa de consulta por ISBN.
