-- 001_users.sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    telegram_id     BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(64),
    first_name      VARCHAR(128),
    last_name       VARCHAR(128),
    phone           VARCHAR(20),
    email           VARCHAR(256),
    company         VARCHAR(256),
    role            VARCHAR(20) DEFAULT 'user', -- user | superadmin
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
