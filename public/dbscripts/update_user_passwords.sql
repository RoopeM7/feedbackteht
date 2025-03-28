ALTER TABLE system_user 
ADD COLUMN ´password´ VARCHAR(100) NULL;

UPDATE system_user 
SET password = '<hashed_password>' 
WHERE id = <user_id>;