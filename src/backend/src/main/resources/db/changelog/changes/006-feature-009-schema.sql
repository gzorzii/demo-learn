-- liquibase formatted sql

-- changeset gzorzi:006-cf-evaluation-response
-- validCheckSum:ANY
CREATE TABLE IF NOT EXISTS cf_evaluation_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_evaluator_id UUID NOT NULL UNIQUE REFERENCES cycle_evaluator(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_response_evaluator
    ON cf_evaluation_response (cycle_evaluator_id)
    WHERE deleted_at IS NULL;

-- changeset gzorzi:006-cf-evaluation-draft
CREATE TABLE IF NOT EXISTS cf_evaluation_draft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_evaluator_id UUID NOT NULL UNIQUE REFERENCES cycle_evaluator(id) ON DELETE CASCADE,
    draft_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_draft_evaluator
    ON cf_evaluation_draft (cycle_evaluator_id)
    WHERE deleted_at IS NULL;