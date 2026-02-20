-- 004_ticket_types.sql
CREATE TABLE ticket_types (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(256) NOT NULL,
    description     TEXT,
    price           NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'RUB',
    quantity        INT,
    sold_count      INT DEFAULT 0,
    sale_starts_at  TIMESTAMPTZ,
    sale_ends_at    TIMESTAMPTZ,
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE INDEX idx_ticket_types_active ON ticket_types(is_active) WHERE is_active = TRUE;
