# Handoff

You are producing a context snapshot to be consumed by an AI in a future session. The reader is Claude, not a human.

<instructions>
Analyze the full conversation history and produce the document. Save it to `.claude/context-snapshot.md`. If the file already exists, delete all its contents and write from scratch — never append.

Steps:

1. Review the entire conversation: code written, decisions made, problems encountered, expressed preferences, agreed conventions, current state.
2. Write for AI consumption: no redundancy between sections, no explanatory prose, no transition phrases. Each bullet is a standalone fact.
3. Each piece of information appears exactly once — in the most relevant section. Do not repeat across sections.
4. Omit anything derivable by reading the code. Include only what was decided, rejected, agreed upon, or discovered in the conversation.
5. Use the exact structure defined in `output_format`.
6. Confirm with the message defined in `confirmation_message`.

Writing rules:

- Short, factual bullets: `[subject] [fact]` — no "it was decided that", "the user prefers that", etc.
- Inline reasons when essential: `JWT stateless: enables horizontal scaling`
- No introductions, no conclusions, no summaries
- Target size: the minimum that allows the next session to not need to ask anything already discussed

</instructions>

<confirmation_message>
Handoff saved to `.claude/context-snapshot.md`.

**To load in the next session:**
When opening a new Claude Code session, write in the first message:

```text
@.claude/context-snapshot.md
```

This injects the full context before your next request.
</confirmation_message>

<output_format>

# Handoff — {YYYY-MM-DD}

## Done

{Short bullets: what was implemented or changed. Include file paths where relevant.}

## Decisions

{Short bullets: technical, architectural, or design decisions made + reason in one line.}

## Conventions and preferences

{Short bullets: patterns agreed during the session, approaches the user approved or rejected, collaboration style, project constraints not documented in the code. Include only what is NOT in CLAUDE.md.}

## Current state

{2-3 lines: what works, what is in progress, what is broken.}

## Next steps

{Numbered list ordered by priority: what still needs to be done.}

## Important context

{Only information NOT derivable from reading the code: known bugs, blocked work, open questions, external dependencies, environment requirements, critical warnings.}

</output_format>

<example>

```markdown
# Handoff — 2026-05-04

## Done

- Authentication module implemented (`src/auth/AuthService.ts`)
- `POST /login` endpoint created and integrated with the database
- Integration tests for authentication added

## Decisions

- JWT over server-side session: stateless API, enables horizontal scaling
- Refresh token with rotation: better security without sacrificing UX
- Isolated test database: prevents data contamination between environments

## Conventions and preferences

- No business logic in controllers — delegate to services
- Validation errors return 422, not 400 (convention agreed in session)
- User prefers dense bullets, no unnecessary prose in responses

## Current state

Login works end-to-end. Refresh token implemented but no automated test. Logout endpoint not yet created.

## Next steps

1. Implement `POST /logout` with refresh token invalidation
2. Add tests for refresh token flow
3. Review JWT expiration — current 1h value may be too long

## Important context

- `JWT_SECRET` env var required in `.env` — no fallback
- Test database must be created manually before running tests
- `/admin` endpoint intentionally blocked — waiting for roles definition
```

</example>
