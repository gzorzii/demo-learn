-- liquibase formatted sql

-- changeset gzorzi:008-cf-pdm-evaluation-draft
CREATE TABLE IF NOT EXISTS cf_pdm_evaluation_draft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_evaluator_id UUID NOT NULL REFERENCES cycle_evaluator(id) ON DELETE CASCADE,
    resultado_draft TEXT,
    prontidao_draft TEXT,
    action_draft TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_pdm_draft_evaluator
    ON cf_pdm_evaluation_draft (cycle_evaluator_id)
    WHERE deleted_at IS NULL;

-- changeset gzorzi:008-cf-pdm-evaluation-response
CREATE TABLE IF NOT EXISTS cf_pdm_evaluation_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_evaluator_id UUID NOT NULL REFERENCES cycle_evaluator(id) ON DELETE CASCADE,
    resultado TEXT NOT NULL,
    prontidao TEXT NOT NULL,
    action TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_pdm_response_evaluator
    ON cf_pdm_evaluation_response (cycle_evaluator_id)
    WHERE deleted_at IS NULL;