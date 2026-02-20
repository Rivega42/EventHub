-- 003_events.sql
CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    org_id          BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    slug            VARCHAR(64) UNIQUE NOT NULL,
    title           VARCHAR(512) NOT NULL,
    description     TEXT,
    venue           VARCHAR(512),
    venue_map_url   VARCHAR(1024),
    city            VARCHAR(128),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ,
    timezone        VARCHAR(64) DEFAULT 'Europe/Moscow',
    status          VARCHAR(20) DEFAULT 'draft', -- draft | published | ongoing | finished | cancelled
    max_attendees   INT,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_org ON events(org_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_starts_at ON events(starts_at);
