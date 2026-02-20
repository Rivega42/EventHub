-- 012_sessions.sql
CREATE TABLE sessions (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    title           VARCHAR(512) NOT NULL,
    description     TEXT,
    speaker_name    VARCHAR(256),
    speaker_bio     TEXT,
    location        VARCHAR(256),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    track           VARCHAR(128),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_event ON sessions(event_id);
CREATE INDEX idx_sessions_starts_at ON sessions(starts_at);
CREATE INDEX idx_sessions_track ON sessions(track);
