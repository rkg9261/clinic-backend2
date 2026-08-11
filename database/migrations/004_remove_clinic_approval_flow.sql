-- Clinics created by admin do not need a separate approval step.

USE clinic_db;

UPDATE branches
SET approval_status = 'APPROVED', is_active = 1
WHERE approval_status = 'PENDING';

ALTER TABLE branches
  MODIFY approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED';
