-- liquibase formatted sql

-- changeset gzorzi:001-create-users
CREATE TABLE users (
    id          UUID        NOT NULL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    created_by  UUID,
    updated_by  UUID
);

-- changeset gzorzi:001-create-role
CREATE TABLE role (
    id          UUID        NOT NULL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    created_by  UUID,
    updated_by  UUID
);

-- changeset gzorzi:001-create-user-role
CREATE TABLE user_role (
    id          UUID        NOT NULL PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id),
    role_id     UUID        NOT NULL REFERENCES role(id),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    created_by  UUID,
    updated_by  UUID
);

CREATE INDEX idx_user_role_user_id ON user_role(user_id);

-- changeset gzorzi:001-seed-admin
INSERT INTO role (id, name, description, created_at, updated_at)
VALUES ('019e1e93-1c85-70a2-bdbe-fbf09601ffa0', 'Administrador', 'Acesso total ao sistema', now(), now());

INSERT INTO users (id, name, email, active, created_at, updated_at)
VALUES ('019e1e92-da72-759d-8c55-d13885aaf931', 'Admin', 'admin@demo.com', true, now(), now());

INSERT INTO user_role (id, user_id, role_id, created_at, updated_at)
VALUES ('019e1e93-3f52-7fbd-ae8d-e4c0892be2f5','019e1e92-da72-759d-8c55-d13885aaf931','019e1e93-1c85-70a2-bdbe-fbf09601ffa0',now(), now());