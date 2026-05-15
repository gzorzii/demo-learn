-- liquibase formatted sql

-- changeset gzorzi:004-update-trigger-type-constraint
ALTER TABLE cycle DROP CONSTRAINT IF EXISTS cycle_trigger_type_check;
ALTER TABLE cycle ADD CONSTRAINT cycle_trigger_type_check
    CHECK (trigger_type IN ('QUARTERLY_AUTO','EVENT','MANUAL_PDM','MANUAL_SUBJECT','MANUAL_COLLABORATOR'));