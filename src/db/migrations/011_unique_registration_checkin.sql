-- 011_unique_registration_checkin.sql
-- Add UNIQUE constraint on registration_id to prevent double check-ins

ALTER TABLE check_ins 
ADD CONSTRAINT unique_registration_checkin UNIQUE (registration_id);
