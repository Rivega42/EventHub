-- 008_check_ins.sql
CREATE TABLE check_ins (
    id              BIGSERIAL PRIMARY KEY,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    scanned_by      BIGINT REFERENCES users(id),
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    location        VARCHAR(128)
);

CREATE INDEX idx_check_ins_reg ON check_ins(registration_id);
CREATE INDEX idx_check_ins_scanned_at ON check_ins(scanned_at);
CREATE INDEX idx_check_ins_scanned_by ON check_ins(scanned_by);
