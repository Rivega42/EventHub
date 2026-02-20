-- 010_event_roles.sql
CREATE TABLE IF NOT EXISTS event_roles (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL, -- organizer | speaker | volunteer
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id, role)
);

CREATE INDEX idx_event_roles_event ON event_roles(event_id);
CREATE INDEX idx_event_roles_user ON event_roles(user_id);
