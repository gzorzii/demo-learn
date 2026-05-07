# Handoff — 2026-05-07

## Done

- `product/features/` directory created (was missing entirely)
- `product/features/000-00.fundacao/business.md` created
- `product/features/000-01.modelagem-dados/business.md` created
- `product/features/000-01.modelagem-dados/tech.md` created (full DDL + JPA entity table + indexes)
- `product/features/000-02.autenticacao/business.md` created
- `product/features/000-02.autenticacao/tech.md` created (passwordless email→JWT, cookie httpOnly)
- `product/features/000-03.home-navegacao/business.md` created

## Decisions

- Auth mechanism: passwordless email login (pipeline overrides description.md magic-link) — user types email, backend validates existence, issues JWT immediately
- JWT delivery: httpOnly cookie (`SameSite=Strict`, `Secure` in prod), 8h expiry, no refresh token
- JWT payload: `sub` (user.id), `name`, `email`, `roles` (array), `branchId` (nullable for Administrator), `iat`, `exp`
- Frontend JWT decode: second non-httpOnly cookie (`auth_info`) or `GET /auth/me` endpoint — decision deferred to implementation
- Enums as Java classes: no `ENUM` types or `CHECK` constraints in DB — all enum columns declared as `TEXT`
- UUIDs: `uuidv7()` function for all primary keys
- No overwrite rule: existing files must never be overwritten

## Conventions and preferences

- Language: Brazilian Portuguese (pt-BR) for all prose in .md files; English for API routes, Java types, table/column names, code snippets
- `business.md` structure: title → `**Delivery status:** Draft` → Resource name/objective → Stack involved → Business rules → Acceptance criteria (Gherkin pt-BR) → Who can access → Out of scope
- Infrastructure features state: *"Infrastructure feature — not a business feature."* in objective section
- Base package: `com.ciet.demo_learn`
- Liquibase: `<sql>` block inside existing changeSet `001-initial-schema`, no new changeSet creation
- `tech.md` structure: Visão técnica → Stack → Backend classes/packages → Backend flow → Spring Security config → Frontend files → Frontend flow → Observações de implementação

## Current state

Pipeline for module `000` in progress. `000-01`, `000-02` complete (both business.md and tech.md). `000-03/tech.md` still missing. `001-initial-schema.xml` exists but contains only an empty changeSet (no DDL yet).

## Next steps

1. **[tech-lead]** Generate `product/features/000-03.home-navegacao/tech.md` — pass `000-01/tech.md` and `000-02/tech.md` as context
2. **[Step 7]** Populate `src/backend/src/main/resources/db/changelog/changes/001-initial-schema.xml` with full DDL from `000-01/tech.md` + role seed (inside existing `<changeSet id="001-initial-schema">`, `<sql>` format, `TEXT` for enums, no ENUM types, FK order respected)
3. **[Step 8]** Report: list all files created or skipped, confirm module 000 complete

## Important context

- `product/description.md` exists — canonical source for business rules and actor definitions
- `description.md` describes magic-link auth but pipeline instructions explicitly override with direct email→JWT — `000-02/business.md` uses pipeline-defined auth
- `001-initial-schema.xml` has skeleton `<changeSet id="001-initial-schema" author="gzorzi">` — only inject `<sql>` inside it, replace `<!-- Add your initial tables here -->` comment if present, preserve XML header
- Table `user` is a PostgreSQL reserved word — DDL uses double-quotes, JPA uses `@Table(name = "\"user\"")`
- Role seed uses `uuidv7()` for IDs: Administrador, Gerente, Catalogador, Caixa
- Pipeline is idempotent: skip any file that already exists with content
