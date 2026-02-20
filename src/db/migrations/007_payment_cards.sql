-- 007_payment_cards.sql
CREATE TABLE payment_cards (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    card_number     VARCHAR(20) NOT NULL,
    card_holder     VARCHAR(256),
    bank_name       VARCHAR(128),
    phone_number    VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE,
    daily_limit     NUMERIC(12,2),
    total_received  NUMERIC(12,2) DEFAULT 0,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_cards_event ON payment_cards(event_id);
CREATE INDEX idx_payment_cards_active ON payment_cards(is_active) WHERE is_active = TRUE;

-- Add foreign key constraint to payments table
ALTER TABLE payments ADD CONSTRAINT fk_payments_card 
    FOREIGN KEY (card_id) REFERENCES payment_cards(id);
