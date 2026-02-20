-- 009_checkin_pins.sql
CREATE TABLE checkin_pins (
    id              SERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    pin_code        VARCHAR(6) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'volunteer', -- 'volunteer' | 'organizer'
    label           VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_checkin_pins_event_pin ON checkin_pins(event_id, pin_code);
CREATE INDEX idx_checkin_pins_active ON checkin_pins(is_active) WHERE is_active = TRUE;
