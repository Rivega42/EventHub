-- 006_payments.sql
CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    card_id         BIGINT, -- Will reference payment_cards after next migration
    amount          NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'RUB',
    status          VARCHAR(20) DEFAULT 'pending',
    -- pending → screenshot_sent → confirmed → rejected
    screenshot_file_id VARCHAR(256),
    confirmed_by    BIGINT REFERENCES users(id),
    confirmed_at    TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_reg ON payments(registration_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_card ON payments(card_id);
