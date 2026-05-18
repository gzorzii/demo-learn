-- liquibase formatted sql

-- changeset gzorzi:007-add-self-evaluation-status
ALTER TABLE cycle_subject ADD COLUMN IF NOT EXISTS self_evaluation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE cycle_subject ADD CONSTRAINT chk_self_eval_status CHECK (self_evaluation_status IN ('PENDING','SUBMITTED'));

-- changeset gzorzi:007-cf-self-evaluation-draft
CREATE TABLE IF NOT EXISTS cf_self_evaluation_draft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_subject_id UUID NOT NULL REFERENCES cycle_subject(id) ON DELETE CASCADE,
    draft_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_self_draft_subject
    ON cf_self_evaluation_draft (cycle_subject_id)
    WHERE deleted_at IS NULL;

-- changeset gzorzi:007-cf-self-evaluation-response
CREATE TABLE IF NOT EXISTS cf_self_evaluation_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_subject_id UUID NOT NULL REFERENCES cycle_subject(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_self_response_subject
    ON cf_self_evaluation_response (cycle_subject_id)
    WHERE deleted_at IS NULL;
