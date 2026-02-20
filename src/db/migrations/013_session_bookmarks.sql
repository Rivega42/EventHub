-- 013_session_bookmarks.sql
CREATE TABLE session_bookmarks (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_id      BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

CREATE INDEX idx_session_bookmarks_user ON session_bookmarks(user_id);
CREATE INDEX idx_session_bookmarks_session ON session_bookmarks(session_id);
