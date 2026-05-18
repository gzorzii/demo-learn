-- liquibase formatted sql

-- changeset gzorzi:003-seed-test-users validCheckSum:ANY
INSERT INTO users (id, name, login, email, role, position_map, active, created_at, updated_at) VALUES
    ('019e2b89-5a4e-70db-b0d8-da73d370733c'::uuid, 'Carlos PDM',   'carlos.pdm',   'carlos.pdm@demo.com.br',   'DEVELOPER', 'SENIOR',    true, now(), now()),
    ('019e2b89-aa2f-7a0a-889c-f46457f5864b'::uuid, 'Ana Souza',    'ana.souza',    'ana.souza@demo.com.br',    'DEVELOPER', 'MID_LEVEL', true, now(), now()),
    ('019e2b8a-0947-7ce5-aeaf-fb3b9ce03848'::uuid, 'Bruno Lima',   'bruno.lima',   'bruno.lima@demo.com.br',   'DEVELOPER', 'MID_LEVEL', true, now(), now()),
    ('019e2b8a-58f4-7b34-8b9b-862fa598e96d'::uuid, 'Carla Mendes', 'carla.mendes', 'carla.mendes@demo.com.br', 'DEVELOPER', 'JUNIOR',    true, now(), now());

UPDATE users SET pdm_id = '019e2b89-5a4e-70db-b0d8-da73d370733c'::uuid
WHERE id IN (
    '019e2b89-aa2f-7a0a-889c-f46457f5864b'::uuid,
    '019e2b8a-0947-7ce5-aeaf-fb3b9ce03848'::uuid,
    '019e2b8a-58f4-7b34-8b9b-862fa598e96d'::uuid
);

INSERT INTO user_permission (id, user_id, role, created_at, updated_at) VALUES
    ('a0000000-0000-0000-0001-000000000001'::uuid, '019e2b89-5a4e-70db-b0d8-da73d370733c'::uuid, 'PDM',    now(), now()),
    ('a0000000-0000-0000-0001-000000000002'::uuid, '019e2b89-aa2f-7a0a-889c-f46457f5864b'::uuid, 'CIETER', now(), now()),
    ('a0000000-0000-0000-0001-000000000003'::uuid, '019e2b8a-0947-7ce5-aeaf-fb3b9ce03848'::uuid, 'CIETER', now(), now()),
    ('a0000000-0000-0000-0001-000000000004'::uuid, '019e2b8a-58f4-7b34-8b9b-862fa598e96d'::uuid, 'CIETER', now(), now());