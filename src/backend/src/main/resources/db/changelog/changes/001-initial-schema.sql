-- liquibase formatted sql

-- changeset gzorzi:001-create-area
CREATE TABLE area (
    id          UUID         NOT NULL PRIMARY KEY,
    region      VARCHAR(100) NOT NULL,
    growth_unit VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    created_by  UUID,
    updated_by  UUID
);

-- changeset gzorzi:001-create-users
CREATE TABLE users (
    id           UUID         NOT NULL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    login        VARCHAR(100) NOT NULL UNIQUE,
    email        VARCHAR(100) NOT NULL UNIQUE,
    role         VARCHAR(50)  NOT NULL,
    position_map VARCHAR(50)  NOT NULL,
    admission_date DATE,
    area_id      UUID         REFERENCES area(id),
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    pdm_id       UUID         REFERENCES users(id),
    bp_id        UUID         REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    created_by   UUID,
    updated_by   UUID,
    deleted_at TIMESTAMPTZ
);

-- changeset gzorzi:001-create-user-permission
CREATE TABLE user_permission (
    id         UUID        NOT NULL PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id),
    role       VARCHAR(50) NOT NULL CHECK (role IN ('CIETER','PDM','CALIBRATOR','BP','ADMIN')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_user_permission_user_id ON user_permission(user_id);

-- changeset gzorzi:001-seed-base
INSERT INTO users (id, name, login, email, role, position_map, active, created_at, updated_at) VALUES
    ('019e223f-5421-7871-962d-8b5b0997b534'::uuid, 'Admin',          'admin',          'admin@demo.com.br',         'DEVELOPER', 'SENIOR',    true, now(), now());

INSERT INTO user_permission (id, user_id, role, created_at, updated_at) VALUES
    ('019e223f-d502-7e9b-8b7d-b5444968da44'::uuid, '019e223f-5421-7871-962d-8b5b0997b534'::uuid, 'ADMIN', now(), now());