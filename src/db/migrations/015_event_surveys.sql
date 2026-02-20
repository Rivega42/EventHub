-- 015_event_surveys.sql
CREATE TABLE event_surveys (
    id                  BIGSERIAL PRIMARY KEY,
    event_id            BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
    overall_rating      SMALLINT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    best_session_id     BIGINT REFERENCES sessions(id) ON DELETE SET NULL,
    improvement         TEXT,
    would_recommend     BOOLEAN NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_surveys_event ON event_surveys(event_id);
CREATE INDEX idx_event_surveys_user ON event_surveys(user_id);
CREATE INDEX idx_event_surveys_overall_rating ON event_surveys(overall_rating);
