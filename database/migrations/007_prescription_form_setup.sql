-- Migration: appointments table, prescription branch_id, master seed data

USE clinic_db;

CREATE TABLE IF NOT EXISTS appointments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    age TINYINT UNSIGNED DEFAULT NULL,
    gender VARCHAR(20) DEFAULT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_appointments_date (appointment_date)
);

ALTER TABLE prescriptions
  MODIFY appointment_id INT DEFAULT NULL;

-- Run once; ignore error if branch_id already exists
ALTER TABLE prescriptions
  ADD COLUMN branch_id INT UNSIGNED DEFAULT NULL AFTER doctor_id;

INSERT IGNORE INTO investigations (name) VALUES
  ('Cervical Spine - AP/Lat. View'),
  ('Lumbar Spine - AP/Lat. View');

INSERT IGNORE INTO pathology_tests (name) VALUES
  ('CBC'),
  ('ESR'),
  ('CRP');

INSERT IGNORE INTO treatment_modalities (category, name) VALUES
  ('STANDARD', 'ThermoTherapy Hot / Cold'),
  ('STANDARD', 'Therapeutic Ultrasound (US)'),
  ('STANDARD', 'Nerve Stimulation (TENS)'),
  ('ADVANCE', 'Pulsed Electro Magnetic Field (PEMF)'),
  ('ADVANCE', 'Terahertz Therapy (THz)'),
  ('EXERCISE', 'ROM Exercises'),
  ('EXERCISE', 'Stretching Exercises'),
  ('EXERCISE', 'Strengthening Exercises'),
  ('ADDON', 'Cupping Therapy - Dry / Wet / Massage'),
  ('ADDON', 'Kinesio Taping / Pain Patch');
