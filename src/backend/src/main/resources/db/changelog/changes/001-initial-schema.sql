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
    area         UUID         REFERENCES area(id),
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    pdm          UUID         REFERENCES users(id),
    bp           UUID         REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    created_by   UUID,
    updated_by   UUID
);

-- changeset gzorzi:001-create-permission
CREATE TABLE permission (
    id          UUID         NOT NULL PRIMARY KEY,
    description VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    created_by  UUID,
    updated_by  UUID
);

-- changeset gzorzi:001-create-user-permission
CREATE TABLE user_permission (
    id            UUID        NOT NULL PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES users(id),
    permission_id UUID        NOT NULL REFERENCES permission(id),
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    created_by    UUID,
    updated_by    UUID
);

CREATE INDEX idx_user_permission_user_id ON user_permission(user_id);

-- changeset gzorzi:001-seed-base
INSERT INTO permission (id, description, created_at, updated_at) VALUES
    ('019e223f-1ba0-767d-b3c4-0df5f5f247fd'::uuid, 'ADMIN',               now(), now());

INSERT INTO users (id, name, login, email, role, position_map, active, created_at, updated_at) VALUES
    ('019e223f-5421-7871-962d-8b5b0997b534'::uuid, 'Admin',          'admin',          'admin@demo.com.br',         'DEVELOPER', 'SENIOR',    true, now(), now());

INSERT INTO user_permission (id, user_id, permission_id, created_at, updated_at) VALUES
    ('019e223f-d502-7e9b-8b7d-b5444968da44'::uuid, '019e223f-5421-7871-962d-8b5b0997b534'::uuid, '019e223f-1ba0-767d-b3c4-0df5f5f247fd'::uuid, now(), now());