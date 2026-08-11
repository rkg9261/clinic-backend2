-- Run on existing clinic_db to add platform features

USE clinic_db;

ALTER TABLE branches
  ADD COLUMN clinic_code VARCHAR(20) NULL AFTER id,
  ADD COLUMN license_file VARCHAR(255) NULL AFTER id_card_background_file,
  ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER license_file;

UPDATE branches SET clinic_code = CONCAT('CLN-', LPAD(id, 4, '0')) WHERE clinic_code IS NULL;
UPDATE branches SET approval_status = 'APPROVED' WHERE approval_status = 'PENDING' AND is_active = 1;

ALTER TABLE branches MODIFY clinic_code VARCHAR(20) NOT NULL;
ALTER TABLE branches ADD UNIQUE KEY uq_branches_clinic_code (clinic_code);

ALTER TABLE users ADD COLUMN patient_id INT UNSIGNED DEFAULT NULL AFTER branch_id;

ALTER TABLE patients
  ADD COLUMN patient_code VARCHAR(30) NULL AFTER file_number,
  ADD COLUMN disease_problem VARCHAR(255) NULL,
  ADD COLUMN package_name VARCHAR(150) NULL,
  ADD COLUMN total_sessions INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN sessions_remaining INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN start_date DATE NULL,
  ADD COLUMN last_attendance_date DATE NULL,
  ADD COLUMN user_id INT UNSIGNED NULL;

UPDATE patients SET patient_code = CONCAT('PID-', LPAD(id, 6, '0')) WHERE patient_code IS NULL;
ALTER TABLE patients MODIFY patient_code VARCHAR(30) NOT NULL;
ALTER TABLE patients ADD UNIQUE KEY uq_patients_code (patient_code);

-- Create remaining tables only if not exist (run schema sections manually if needed)
