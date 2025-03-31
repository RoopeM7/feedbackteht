ALTER TABLE system_user 
ADD COLUMN ´password´ VARCHAR(100) NULL;

update system_user
SET password = '$2b$10$YFgdsCJC0d8y1kPIX.bOEOBicbxO/GTJx.P3hlAeq6m.0nyeQREtu'
WHERE id = 14;

ALTER TABLE system_user 

update system_user
SET password = '$2b$10$i/WcriPki6i.3CS9MSnh6.UwEc/EjrLAHDkKhU4dXAkwDWvZD.dvW'
WHERE id = 15;