-- 017_bot_blocked.sql
-- Add bot_blocked column to track users who blocked the bot (403 error)
ALTER TABLE users ADD COLUMN bot_blocked BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_bot_blocked ON users(bot_blocked) WHERE bot_blocked = FALSE;
