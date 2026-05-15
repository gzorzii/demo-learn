-- liquibase formatted sql

-- changeset gzorzi:005-add-validated-at-to-cycle-subject
ALTER TABLE cycle_subject ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- changeset gzorzi:005-add-source-to-cycle-evaluator
ALTER TABLE cycle_evaluator ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'ONA_SUGGESTION';
ALTER TABLE cycle_evaluator ADD CONSTRAINT chk_evaluator_source CHECK (source IN ('ONA_SUGGESTION','MANUAL_SUBJECT','MANUAL_PDM'));

-- changeset gzorzi:005-add-added-by-to-cycle-evaluator
ALTER TABLE cycle_evaluator ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- changeset gzorzi:005-add-evaluator-indexes
CREATE INDEX IF NOT EXISTS idx_subject_validation_deadline
  ON cycle_subject (validation_deadline)
  WHERE status = 'VALIDATING_EVALUATORS' AND deleted_at IS NULL AND closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluator_source
  ON cycle_evaluator (cycle_subject_id, source)
  WHERE deleted_at IS NULL;
