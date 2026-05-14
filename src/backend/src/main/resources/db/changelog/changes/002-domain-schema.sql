-- liquibase formatted sql

-- changeset gzorzi:002-create-cycle
CREATE TABLE cycle (
    id                     UUID         NOT NULL PRIMARY KEY,
    cycle_type             VARCHAR(10)  NOT NULL CHECK (cycle_type IN ('CF','PR')),
    year                   INTEGER      NOT NULL,
    status                 VARCHAR(50)  NOT NULL,
    name                   VARCHAR(255),
    trigger_type           VARCHAR(50)  CHECK (trigger_type IN ('QUARTERLY_AUTO','EVENT','MANUAL_PDM','MANUAL_SUBJECT')),
    quarter                INTEGER,
    is_blackout            BOOLEAN,
    validation_deadline    TIMESTAMPTZ,
    collection_start_at    TIMESTAMPTZ,
    collection_deadline    TIMESTAMPTZ,
    closed_at              TIMESTAMPTZ,
    created_by             UUID,
    created_at             TIMESTAMPTZ  NOT NULL,
    updated_at             TIMESTAMPTZ  NOT NULL,
    updated_by             UUID,
    deleted_at             TIMESTAMPTZ
);

-- changeset gzorzi:002-create-pr-cycle-group
CREATE TABLE pr_cycle_group (
    id                UUID        NOT NULL PRIMARY KEY,
    cycle_id          UUID        NOT NULL REFERENCES cycle(id),
    group_label       VARCHAR(50) NOT NULL,
    quarter           INTEGER     NOT NULL,
    blackout_start_at TIMESTAMPTZ,
    blackout_end_at   TIMESTAMPTZ,
    start_at          TIMESTAMPTZ,
    end_at            TIMESTAMPTZ,
    status            VARCHAR(50) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    created_by        UUID,
    updated_by        UUID,
    deleted_at        TIMESTAMPTZ
);

-- changeset gzorzi:002-create-cycle-subject
CREATE TABLE cycle_subject (
    id                            UUID        NOT NULL PRIMARY KEY,
    cycle_id                      UUID        NOT NULL REFERENCES cycle(id),
    cycle_group_id                UUID        REFERENCES pr_cycle_group(id),
    subject_user_id               UUID        NOT NULL REFERENCES users(id),
    status                        VARCHAR(50) NOT NULL,
    allocation_model              VARCHAR(20) CHECK (allocation_model IN ('TEAM','STAFF_AUG','SDLC')),
    validation_deadline           TIMESTAMPTZ,
    collection_start_at           TIMESTAMPTZ,
    closed_at                     TIMESTAMPTZ,
    closed_by                     UUID        REFERENCES users(id),
    submitted_for_calibration_at  TIMESTAMPTZ,
    created_at                    TIMESTAMPTZ NOT NULL,
    updated_at                    TIMESTAMPTZ NOT NULL,
    created_by                    UUID,
    updated_by                    UUID,
    deleted_at                    TIMESTAMPTZ
);

-- changeset gzorzi:002-create-cycle-evaluator
CREATE TABLE cycle_evaluator (
    id                UUID        NOT NULL PRIMARY KEY,
    cycle_subject_id  UUID        NOT NULL REFERENCES cycle_subject(id),
    evaluator_user_id UUID        NOT NULL REFERENCES users(id),
    evaluator_type    VARCHAR(10) NOT NULL CHECK (evaluator_type IN ('SELF','PDM','PEER')),
    status            VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','RESPONDED','SKIPPED')),
    is_mandatory      BOOLEAN     NOT NULL DEFAULT FALSE,
    responded_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    created_by        UUID,
    updated_by        UUID,
    deleted_at        TIMESTAMPTZ
);

-- changeset gzorzi:002-create-cf-response
CREATE TABLE cf_response (
    id                  UUID        NOT NULL PRIMARY KEY,
    cycle_evaluator_id  UUID        NOT NULL REFERENCES cycle_evaluator(id),
    content             TEXT        NOT NULL,
    submitted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL,
    created_by          UUID,
    updated_by          UUID
);

-- changeset gzorzi:002-create-cycle-self-evaluation
CREATE TABLE cycle_self_evaluation (
    id               UUID        NOT NULL PRIMARY KEY,
    cycle_subject_id UUID        NOT NULL UNIQUE REFERENCES cycle_subject(id),
    content          TEXT,
    d1_score         INTEGER     CHECK (d1_score BETWEEN 1 AND 4),
    d1_comment       TEXT,
    d2_score         INTEGER     CHECK (d2_score BETWEEN 1 AND 4),
    d2_comment       TEXT,
    d3_score         INTEGER     CHECK (d3_score BETWEEN 1 AND 4),
    d3_comment       TEXT,
    submitted_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL,
    created_by       UUID,
    updated_by       UUID
);

-- changeset gzorzi:002-create-cycle-ai-summary
CREATE TABLE cycle_ai_summary (
    id               UUID         NOT NULL PRIMARY KEY,
    cycle_subject_id UUID         NOT NULL UNIQUE REFERENCES cycle_subject(id),
    summary_text     TEXT,
    coherence_analysis TEXT,
    ai_model_version VARCHAR(100),
    status           VARCHAR(30)  NOT NULL CHECK (status IN ('PENDING_APPROVAL','APPROVED','REJECTED')),
    approved_by      UUID         REFERENCES users(id),
    approved_at      TIMESTAMPTZ,
    generated_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    created_by       UUID,
    updated_by       UUID
);

-- changeset gzorzi:002-create-pr-peer-response
CREATE TABLE pr_peer_response (
    id                 UUID        NOT NULL PRIMARY KEY,
    cycle_evaluator_id UUID        NOT NULL REFERENCES cycle_evaluator(id),
    d1_score           INTEGER     NOT NULL CHECK (d1_score BETWEEN 1 AND 4),
    d1_comment         TEXT,
    d2_score           INTEGER     NOT NULL CHECK (d2_score BETWEEN 1 AND 4),
    d2_comment         TEXT,
    d3_score           INTEGER     NOT NULL CHECK (d3_score BETWEEN 1 AND 4),
    d3_comment         TEXT,
    submitted_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL,
    created_by         UUID,
    updated_by         UUID
);

-- changeset gzorzi:002-create-pr-pdm-assessment
CREATE TABLE pr_pdm_assessment (
    id                     UUID        NOT NULL PRIMARY KEY,
    cycle_subject_id       UUID        NOT NULL REFERENCES cycle_subject(id),
    pdm_user_id            UUID        NOT NULL REFERENCES users(id),
    d1_score               INTEGER     CHECK (d1_score BETWEEN 1 AND 4),
    d1_comment             TEXT,
    d2_score               INTEGER     CHECK (d2_score BETWEEN 1 AND 4),
    d2_comment             TEXT,
    d3_score               INTEGER     CHECK (d3_score BETWEEN 1 AND 4),
    d3_comment             TEXT,
    score_adjustment       INTEGER     CHECK (score_adjustment IN (-1, 0, 1)),
    score_adjustment_reason TEXT,
    prework_context        TEXT,
    status                 VARCHAR(20) NOT NULL,
    submitted_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL,
    updated_at             TIMESTAMPTZ NOT NULL,
    created_by             UUID,
    updated_by             UUID
);

-- changeset gzorzi:002-create-pr-ai-alert
CREATE TABLE pr_ai_alert (
    id                    UUID        NOT NULL PRIMARY KEY,
    pr_pdm_assessment_id  UUID        REFERENCES pr_pdm_assessment(id),
    pr_peer_response_id   UUID        REFERENCES pr_peer_response(id),
    alert_type            VARCHAR(50) NOT NULL CHECK (alert_type IN ('INSUFFICIENT_DETAIL','LOW_DIMENSION_COVERAGE','INCOHERENCE')),
    alert_message         TEXT,
    status                VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','DISMISSED','RESOLVED')),
    created_at            TIMESTAMPTZ NOT NULL,
    updated_at            TIMESTAMPTZ NOT NULL,
    created_by            UUID,
    updated_by            UUID,
    CONSTRAINT chk_pr_ai_alert_source CHECK (
        (pr_pdm_assessment_id IS NULL) <> (pr_peer_response_id IS NULL)
    )
);

-- changeset gzorzi:002-create-calibration-session
CREATE TABLE calibration_session (
    id                  UUID        NOT NULL PRIMARY KEY,
    cycle_id            UUID        NOT NULL REFERENCES cycle(id),
    calibrator_user_id  UUID        NOT NULL REFERENCES users(id),
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    paused_at           TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED','IN_PROGRESS','PAUSED','CLOSED')),
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL,
    created_by          UUID,
    updated_by          UUID,
    deleted_at          TIMESTAMPTZ
);

-- changeset gzorzi:002-create-calibration-session-participant
CREATE TABLE calibration_session_participant (
    id                     UUID        NOT NULL PRIMARY KEY,
    calibration_session_id UUID        NOT NULL REFERENCES calibration_session(id),
    participant_user_id    UUID        NOT NULL REFERENCES users(id),
    role_in_session        VARCHAR(20) NOT NULL CHECK (role_in_session IN ('PDM','CALIBRADOR','BP','GOVERNANCA')),
    confirmed_presence     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL,
    updated_at             TIMESTAMPTZ NOT NULL,
    created_by             UUID,
    updated_by             UUID
);

-- changeset gzorzi:002-create-calibration-item
CREATE TABLE calibration_item (
    id                     UUID        NOT NULL PRIMARY KEY,
    calibration_session_id UUID        NOT NULL REFERENCES calibration_session(id),
    cycle_subject_id       UUID        NOT NULL REFERENCES cycle_subject(id),
    nine_box_x_proposed    INTEGER     CHECK (nine_box_x_proposed BETWEEN 1 AND 3),
    nine_box_y_proposed    INTEGER     CHECK (nine_box_y_proposed BETWEEN 1 AND 3),
    nine_box_x_final       INTEGER     CHECK (nine_box_x_final BETWEEN 1 AND 3),
    nine_box_y_final       INTEGER     CHECK (nine_box_y_final BETWEEN 1 AND 3),
    d1_score_final         INTEGER     CHECK (d1_score_final BETWEEN 1 AND 4),
    d2_score_final         INTEGER     CHECK (d2_score_final BETWEEN 1 AND 4),
    d3_score_final         INTEGER     CHECK (d3_score_final BETWEEN 1 AND 4),
    closed_by              UUID        REFERENCES users(id),
    closed_at              TIMESTAMPTZ,
    last_saved_at          TIMESTAMPTZ,
    status                 VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','DRAFT','CONFIRMED')),
    created_at             TIMESTAMPTZ NOT NULL,
    updated_at             TIMESTAMPTZ NOT NULL,
    created_by             UUID,
    updated_by             UUID,
    deleted_at             TIMESTAMPTZ
);

-- changeset gzorzi:002-create-pr-calibration-result
CREATE TABLE pr_calibration_result (
    id                  UUID    NOT NULL PRIMARY KEY,
    cycle_subject_id    UUID    NOT NULL UNIQUE REFERENCES cycle_subject(id),
    calibration_item_id UUID    NOT NULL REFERENCES calibration_item(id),
    d1_score_final      INTEGER NOT NULL CHECK (d1_score_final BETWEEN 1 AND 4),
    d2_score_final      INTEGER NOT NULL CHECK (d2_score_final BETWEEN 1 AND 4),
    d3_score_final      INTEGER NOT NULL CHECK (d3_score_final BETWEEN 1 AND 4),
    nine_box_x          INTEGER NOT NULL CHECK (nine_box_x BETWEEN 1 AND 3),
    nine_box_y          INTEGER NOT NULL CHECK (nine_box_y BETWEEN 1 AND 3),
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL,
    created_by          UUID,
    updated_by          UUID
);

-- changeset gzorzi:002-create-pr-debriefing
CREATE TABLE pr_debriefing (
    id               UUID        NOT NULL PRIMARY KEY,
    cycle_subject_id UUID        NOT NULL UNIQUE REFERENCES cycle_subject(id),
    pdm_user_id      UUID        NOT NULL REFERENCES users(id),
    status           VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','SCHEDULED','CONDUCTED')),
    scheduled_at     TIMESTAMPTZ,
    conducted_at     TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL,
    created_by       UUID,
    updated_by       UUID
);

-- changeset gzorzi:002-create-cycle-blackout
CREATE TABLE cycle_blackout (
    id                UUID        NOT NULL PRIMARY KEY,
    pr_cycle_group_id UUID        NOT NULL REFERENCES pr_cycle_group(id),
    starts_at         TIMESTAMPTZ NOT NULL,
    ends_at           TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    created_by        UUID,
    updated_by        UUID
);

-- changeset gzorzi:002-create-ona-suggestion
CREATE TABLE ona_suggestion (
    id               UUID        NOT NULL PRIMARY KEY,
    subject_user_id  UUID        NOT NULL REFERENCES users(id),
    suggested_user_id UUID       NOT NULL REFERENCES users(id),
    cycle_type       VARCHAR(10) NOT NULL CHECK (cycle_type IN ('CF','PR')),
    cycle_subject_id UUID,
    reason_mock      TEXT,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL,
    created_by       UUID,
    updated_by       UUID
);

-- changeset gzorzi:002-create-indexes
CREATE INDEX idx_users_area_id ON users (area_id);
CREATE INDEX idx_users_pdm_id ON users (pdm_id);
CREATE INDEX idx_users_bp_id ON users (bp_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (active) WHERE active = true;
CREATE INDEX idx_cycle_type ON cycle (cycle_type);
CREATE INDEX idx_cycle_status ON cycle (status);
CREATE INDEX idx_cycle_year ON cycle (year);
CREATE INDEX idx_subject_cycle ON cycle_subject (cycle_id);
CREATE INDEX idx_subject_group ON cycle_subject (cycle_group_id);
CREATE INDEX idx_subject_user ON cycle_subject (subject_user_id);
CREATE INDEX idx_subject_status ON cycle_subject (status);
CREATE INDEX idx_evaluator_subject ON cycle_evaluator (cycle_subject_id);
CREATE INDEX idx_evaluator_user ON cycle_evaluator (evaluator_user_id);
CREATE INDEX idx_evaluator_status ON cycle_evaluator (status);
CREATE INDEX idx_cal_item_session ON calibration_item (calibration_session_id);
CREATE INDEX idx_cal_item_subject ON calibration_item (cycle_subject_id);
CREATE INDEX idx_cal_item_status ON calibration_item (status);
CREATE INDEX idx_cal_result_subject ON pr_calibration_result (cycle_subject_id);
CREATE INDEX idx_debriefing_subject ON pr_debriefing (cycle_subject_id);
CREATE INDEX idx_debriefing_status ON pr_debriefing (status);
CREATE INDEX idx_ai_alert_assessment ON pr_ai_alert (pr_pdm_assessment_id) WHERE pr_pdm_assessment_id IS NOT NULL;
CREATE INDEX idx_ai_alert_peer ON pr_ai_alert (pr_peer_response_id) WHERE pr_peer_response_id IS NOT NULL;
