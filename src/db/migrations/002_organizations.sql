-- 002_organizations.sql
CREATE TABLE organizations (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    owner_id        BIGINT REFERENCES users(id),
    plan            VARCHAR(20) DEFAULT 'free', -- free | pro | enterprise
    plan_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_members (
    id              BIGSERIAL PRIMARY KEY,
    org_id          BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    role            VARCHAR(20) NOT NULL, -- owner | admin | manager
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);
