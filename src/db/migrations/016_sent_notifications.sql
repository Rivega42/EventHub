-- 016_sent_notifications.sql
CREATE TABLE sent_notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(64) NOT NULL,
    entity_id       BIGINT NOT NULL, -- event_id or session_id
    time_offset     VARCHAR(16), -- e.g. '15min', '1hour', '24hours'
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type, entity_id, time_offset)
);

CREATE INDEX idx_sent_notifications_user ON sent_notifications(user_id);
CREATE INDEX idx_sent_notifications_type ON sent_notifications(notification_type);
CREATE INDEX idx_sent_notifications_entity ON sent_notifications(entity_id);
