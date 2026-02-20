-- 005_registrations.sql
CREATE TABLE registrations (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    ticket_type_id  BIGINT REFERENCES ticket_types(id),
    status          VARCHAR(20) DEFAULT 'pending',
    -- pending → awaiting_payment → payment_review → confirmed → checked_in → cancelled
    qr_token        UUID DEFAULT gen_random_uuid(),
    qr_hmac         VARCHAR(128),
    reg_data        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_reg_event ON registrations(event_id);
CREATE INDEX idx_reg_user ON registrations(user_id);
CREATE INDEX idx_reg_qr ON registrations(qr_token);
CREATE INDEX idx_reg_status ON registrations(status);
