# Editar Cliente — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `007-00.clientes`. Implementa a atualização parcial dos dados cadastrais de um cliente existente via `PATCH /customers/{id}`. Opera exclusivamente sobre a tabela `customer`, já definida em `000-01.modelagem-dados/tech.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura em `customer` (busca por id e verificação de unicidade de `cpf_cnpj`); escrita em `customer` (`UPDATE` dos campos editáveis) |
| Serviço | Validação de escopo de filial; verificação de campos imutáveis; checagem de conflito de `cpf_cnpj`; atualização de `updated_at` |
| Frontend | Tela `/clientes/:id/editar`; carregamento dos dados atuais via `GET /customers/{id}` (especificado em `007-03`); submissão via `PATCH /customers/{id}` |

Os campos `cpf_cnpj` e `branch_id` são **imutáveis** após a criação do cliente. O contexto da instrução de negócio permite que `cpf_cnpj` seja enviado no body (por exemplo, para reenviar o valor sem alteração), mas o backend deve rejeitar qualquer tentativa de alterar o valor armazenado. A abordagem adotada aqui é: se `cpf_cnpj` for enviado no body, o backend verifica se o valor é idêntico ao já persistido — se diferir, retorna `409`; se for idêntico, ignora o campo. Campos não enviados no body (`undefined`) não são alterados.

> A razão para usar `PATCH` em vez de `PUT` é que a edição não requer o envio de todos os campos — apenas os campos que o usuário alterou precisam ser transmitidos. Isso evita sobrescrever acidentalmente campos não exibidos no formulário.

## Modelo de dados

### Novas tabelas / alterações de schema

Esta feature **não cria tabelas novas nem altera o schema**. A tabela `customer` já existe no changeSet `001-initial-schema` de `000-01.modelagem-dados/tech.md`.

Tabelas lidas e escritas por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `customer` | `SELECT` | busca por `id` para verificar existência, `branch_id` e `cpf_cnpj` atual |
| `customer` | `SELECT` | verificação de unicidade: `WHERE cpf_cnpj = :novo AND branch_id = :branch AND id != :id` |
| `customer` | `UPDATE` | campos editáveis (`name`, `phone`, `address`); `updated_at = now()` |

### Campos imutáveis

Os campos abaixo **não devem ser alterados** por este endpoint. Se `cpf_cnpj` for recebido com valor diferente do armazenado, deve retornar `409`. Se `branch_id` for recebido no body, deve ser rejeitado com `400`.

| Campo | Tabela | Motivo da imutabilidade |
|-------|--------|------------------------|
| `cpf_cnpj` | `customer` | identificador fiscal do cliente; alteração geraria inconsistência com vouchers e futura NF-e |
| `branch_id` | `customer` | filial de cadastro é definitiva; transferência entre filiais está fora do escopo |
| `id` | `customer` | chave primária; nunca alterável |
| `created_at` | `customer` | data de criação definida pelo servidor na inserção |

### Estratégia de migração

Nenhuma migration nova é necessária. O schema já existe. Rollback não aplicável.

A coluna `cpf_cnpj` na tabela `customer` não possui `UNIQUE` constraint no banco (a unicidade é por filial, não global). A verificação é feita na camada de serviço com query explícita, conforme padrão já estabelecido no módulo.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o perfil Administrador, `branchId` é `null` no JWT — nesse caso, o backend deve exigir um query param `branch_id` explícito; ausência retorna `400`.

---

### `PATCH /customers/{id}`

- **Authorization:** `Administrador`, `Gerente`
- **Path param:** `id` — UUID do cliente (UUID v7)

#### Request body

Todos os campos são opcionais no sentido de que não precisam ser enviados simultaneamente, mas `name` não pode ser enviado como string vazia.

| Campo | Tipo | Obrigatório | Regras de validação |
|-------|------|-------------|---------------------|
| `name` | `string` | não (mas não pode ser vazio se enviado) | se presente: não vazio, máx. 255 caracteres |
| `phone` | `string \| null` | não | se presente: máx. 20 caracteres; `null` limpa o campo |
| `address` | `string \| null` | não | se presente: máx. 500 caracteres; `null` limpa o campo |
| `cpf_cnpj` | `string` | não | se presente: deve ser idêntico ao valor já armazenado (apenas dígitos); qualquer divergência → `409`; `branch_id` e `id` jamais aceitos no body |

> O campo `cpf_cnpj` pode ser enviado pelo frontend quando o formulário reenvia todos os dados sem alteração. O backend trata esse caso verificando igualdade, não lançando erro desnecessário. Se o frontend não enviar `cpf_cnpj`, o campo não é tocado.

#### Sequência de execução no serviço

Executada em uma única transação atômica:

1. Validar campos de entrada conforme tabela acima. Se `branch_id` ou `created_at` presentes no body → `400`.
2. Buscar o cliente: `SELECT * FROM customer WHERE id = :id`. Se não encontrado → `404`.
3. Verificar isolamento de filial: `customer.branch_id` deve ser igual ao `branchId` do JWT (ou ao query param `branch_id` para Administrador). Se diferir → `403`.
4. Se `cpf_cnpj` presente no body e diferente de `customer.cpf_cnpj` → `409` ("CPF/CNPJ não pode ser alterado").
5. Se `name` presente no body e vazio → `400`.
6. Aplicar apenas os campos presentes no body (semântica PATCH): campos ausentes mantêm o valor atual.
7. Executar `UPDATE customer SET name=?, phone=?, address=?, updated_at=now() WHERE id=?` com os valores resultantes.
8. Commit da transação.
9. Retornar `200` com os dados atualizados do cliente.

> A checagem de imutabilidade de `cpf_cnpj` (passo 4) usa `409` em vez de `400` porque não é um erro de formato — é um conflito de estado: o valor diverge do estado persistido de forma intencional pela regra de negócio.

#### Response `200`

```json
{
  "id": "uuid",
  "name": "string",
  "phone": "string|null",
  "address": "string|null",
  "cpf_cnpj": "string",
  "branch_id": "uuid",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

#### Status codes

| Código | Quando ocorre |
|--------|--------------|
| `200` | Cliente atualizado com sucesso |
| `400` | Falha de validação: `name` vazio, campo imutável (`branch_id`, `created_at`) presente no body, ou Administrador sem `branch_id` query param |
| `401` | Cookie `auth_token` ausente ou JWT inválido/expirado |
| `403` | Cliente pertence a outra filial; ou perfil sem permissão (`Catalogador`, `Caixa`) |
| `404` | UUID não encontrado na tabela `customer` |
| `409` | `cpf_cnpj` enviado no body difere do valor armazenado (tentativa implícita de alteração) |
| `500` | Erro inesperado |

#### Edge cases

- Se nenhum campo editável for enviado no body (body vazio `{}`), o serviço pode aceitar e retornar `200` sem alterar o registro — ou retornar `400` com mensagem "nenhum campo informado para atualização". A decisão deve ser tomada durante a implementação e documentada.
- Se `phone` ou `address` forem enviados como `null`, o campo correspondente é limpo (definido como `NULL` no banco).
- O `cpf_cnpj` retornado na response deve conter apenas dígitos, sem formatação — a máscara é responsabilidade do frontend.
- Perfil Administrador com `branchId = null` no JWT deve exigir query param `branch_id`; ausência → `400`.

---

## DTOs de domínio

| DTO | Direção | Campos |
|-----|---------|--------|
| `CustomerUpdateRequest` | Request body de `PATCH /customers/{id}` | `name?: String`, `phone?: String`, `address?: String`, `cpf_cnpj?: String` |
| `CustomerResponse` | Response de `PATCH /customers/{id}` e `GET /customers/{id}` | `id`, `name`, `phone`, `address`, `cpf_cnpj`, `branch_id`, `created_at`, `updated_at` |

> `CustomerResponse` deve ser reutilizado pelo endpoint de leitura de ficha do cliente (feature `007-03`), evitando duplicação de DTO entre sub-features do mesmo módulo.

## Requisitos de qualidade

- [ ] I/O-bound identificado? `SELECT` (busca por id + verificação de unicidade) e `UPDATE` em `customer` são I/O-bound — candidatos a virtual threads (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] GraalVM AOT: nenhuma reflexão dinâmica introduzida. Os records `CustomerUpdateRequest` e `CustomerResponse` devem ser registrados para serialização AOT caso exigido pelo perfil de build nativo.
- [ ] Dados sensíveis tratados adequadamente? O campo `cpf_cnpj` é dado fiscal sensível. Não deve aparecer em logs de depuração. A response retorna o valor para exibição na ficha — o frontend aplica a máscara antes de exibir.
- [ ] Autorização por perfil coberta em todos os endpoints? Perfis `Catalogador` e `Caixa` recebem `403`. Administrador sem `branch_id` query param recebe `400`. Gerente só acessa clientes da própria filial.

## Estratégia de testes

### Fluxo principal (happy path)

- `PATCH /customers/{id}` com `name` e `phone` atualizados; verificar `200`, `customer.name` e `customer.phone` atualizados no banco, `updated_at` refletindo o timestamp da operação.
- `PATCH /customers/{id}` alterando apenas `address`; verificar que `name`, `phone` e `cpf_cnpj` permanecem inalterados.
- `PATCH /customers/{id}` com `phone: null`; verificar que `customer.phone` é `NULL` no banco.
- `PATCH /customers/{id}` com `cpf_cnpj` igual ao valor já armazenado (reenvio sem alteração); verificar `200` sem erro.
- Após edição bem-sucedida, verificar que o frontend redireciona para `/clientes/:id` com os dados atualizados.
- Acionar "Cancelar" no formulário; verificar redirecionamento para `/clientes/:id` sem chamada ao backend.

### Casos de erro esperados

- `PATCH /customers/{id}` com `name: ""` → `400`.
- `PATCH /customers/{id}` com `name` ausente do body e `phone` como único campo — deve aceitar sem exigir `name`.
- `PATCH /customers/{id}` com `branch_id` no body → `400`.
- `PATCH /customers/{id}` com `cpf_cnpj` diferente do armazenado → `409`.
- `PATCH /customers/{id}` com UUID inexistente → `404`.
- `PATCH /customers/{id}` tentando editar cliente de outra filial → `403`.

### Casos de autorização

- Perfil `Caixa` tentando `PATCH /customers/{id}` → `403`.
- Perfil `Catalogador` tentando `PATCH /customers/{id}` → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.
- Gerente editando cliente da própria filial → `200`.
- Administrador com `branch_id` query param editando cliente da filial informada → `200`.
- Administrador sem `branch_id` query param → `400`.
- Gerente tentando acessar `/clientes/:id/editar` de cliente de outra filial → `403` (backend); `RoleRoute` não bloqueia (é controle de backend).

### Casos de borda das regras de negócio

- Enviar body vazio `{}`; verificar comportamento definido na implementação (aceitar com `200` ou rejeitar com `400`).
- Enviar `cpf_cnpj` com formatação (ex.: `"123.456.789-01"`) diferente do valor armazenado sem formatação (`"12345678901"`): deve retornar `409` (o valor com pontuação não é idêntico ao valor armazenado).
- Verificar que `cpf_cnpj` e `branch_id` não são alterados no banco mesmo que enviados com valor idêntico ao atual.
- Verificar que `updated_at` é sempre atualizado quando qualquer campo é modificado.
- Verificar que `created_at` não é alterado em nenhuma circunstância.

## Riscos técnicos e dependências

1. **Dependência de `GET /customers/{id}` para pré-preenchimento do formulário.** O frontend desta feature depende de um endpoint de leitura da ficha do cliente para carregar os dados atuais antes de exibir o formulário de edição. Esse endpoint é introduzido pela feature `007-03.listar-clientes` (ficha do cliente em `/clientes/:id`). Se `007-03` não estiver implementado, o formulário não pode ser montado. As duas sub-features devem ser entregues juntas ou `007-03` deve preceder `007-02` na ordem de implementação.

2. **Semântica PATCH com campos opcionais em Java.** A implementação de PATCH parcial em Spring Boot requer cuidado: `null` no JSON pode significar "limpar o campo" (intenção explícita) ou "campo não enviado" (campo ausente no body). O DTO deve distinguir os dois casos — uma abordagem comum é usar `Optional<String>` ou `@JsonInclude` para detectar campos ausentes vs. explicitamente nulos. A decisão de representação deve ser tomada pelo agente de implementação e documentada.

3. **`cpf_cnpj` sem constraint UNIQUE no banco.** A unicidade por filial é verificada na camada de serviço, não por constraint de banco. Embora esta feature não altere `cpf_cnpj`, o risco existe para a feature `007-01.cadastrar-cliente` e potenciais migrações futuras. Para esta feature, o risco é baixo: apenas leitura e comparação de igualdade do campo.

4. **Administrador sem `branchId` no JWT.** O claim `branchId` é `null` para Administrador. O serviço deve exigir o query param `branch_id` explícito nesse caso, conforme padrão já estabelecido nas demais features do sistema (ver `001-01.cadastrar-livro`, `001-02.editar-livro`). A lógica de resolução de `branch_id` deve ser reutilizável.
