-- Migration: Prescription form v2 — normalized schema for multipart prescription form
-- Run after 007_prescription_form_setup.sql

USE clinic_db;

-- Drop legacy prescription tables (v1)
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescription_session_charges;
DROP TABLE IF EXISTS prescription_discounts;
DROP TABLE IF EXISTS prescription_modalities;
DROP TABLE IF EXISTS prescription_pathology;
DROP TABLE IF EXISTS prescription_investigations;
DROP TABLE IF EXISTS prescription_patient_snapshot;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS investigations_master;
DROP TABLE IF EXISTS investigation_categories;
DROP TABLE IF EXISTS pathology_master;
DROP TABLE IF EXISTS treatment_modalities_master;
DROP TABLE IF EXISTS investigations;
DROP TABLE IF EXISTS pathology_tests;
DROP TABLE IF EXISTS treatment_modalities;

CREATE TABLE investigation_categories (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_investigation_category_name (name)
);

CREATE TABLE investigations_master (
  id BIGINT NOT NULL AUTO_INCREMENT,
  category_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY category_id (category_id),
  CONSTRAINT investigations_master_ibfk_1
    FOREIGN KEY (category_id) REFERENCES investigation_categories (id)
);

CREATE TABLE pathology_master (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE treatment_modalities_master (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category ENUM('STANDARD','ADVANCED','THERAPEUTIC','ADDON') NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_modality_category (category)
);

CREATE TABLE prescriptions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  prescription_no VARCHAR(30) NOT NULL,
  appointment_id INT UNSIGNED DEFAULT NULL,
  patient_id INT UNSIGNED NOT NULL,
  doctor_id INT NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  prescription_date DATETIME NOT NULL,
  chief_complaint TEXT,
  other_details TEXT,
  examination TEXT,
  diagnosis TEXT,
  investigation_notes TEXT,
  advanced_xray_lab VARCHAR(255) DEFAULT NULL,
  other_investigation TEXT,
  home_rehab TEXT,
  home_recovery_program TEXT,
  accelerated_recovery_package TEXT,
  frequency VARCHAR(100) DEFAULT NULL,
  duration VARCHAR(100) DEFAULT NULL,
  remarks TEXT,
  status ENUM('ACTIVE','CANCELLED') DEFAULT 'ACTIVE',
  created_by BIGINT DEFAULT NULL,
  updated_by BIGINT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY prescription_no (prescription_no),
  KEY doctor_id (doctor_id),
  KEY idx_patient_branch (patient_id, branch_id),
  KEY idx_prescription_date (prescription_date),
  KEY idx_prescription_status (status),
  KEY idx_branch_date (branch_id, prescription_date),
  KEY fk_prescription_appointment (appointment_id),
  CONSTRAINT fk_prescription_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL,
  CONSTRAINT prescriptions_ibfk_1
    FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT prescriptions_ibfk_2
    FOREIGN KEY (doctor_id) REFERENCES doctors (id),
  CONSTRAINT prescriptions_ibfk_3
    FOREIGN KEY (branch_id) REFERENCES branches (id)
);

CREATE TABLE prescription_patient_snapshot (
  id BIGINT NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  patient_name VARCHAR(150) DEFAULT NULL,
  age INT DEFAULT NULL,
  gender ENUM('Male','Female','Other') DEFAULT NULL,
  address TEXT,
  referred_by VARCHAR(150) DEFAULT NULL,
  visit_datetime DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_snapshot_prescription (prescription_id),
  CONSTRAINT prescription_patient_snapshot_ibfk_1
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE
);

CREATE TABLE prescription_investigations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  investigation_id BIGINT NOT NULL,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prescription_investigation (prescription_id, investigation_id),
  KEY prescription_id (prescription_id),
  KEY investigation_id (investigation_id),
  CONSTRAINT prescription_investigations_ibfk_1
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE,
  CONSTRAINT prescription_investigations_ibfk_2
    FOREIGN KEY (investigation_id) REFERENCES investigations_master (id)
);

CREATE TABLE prescription_pathology (
  id BIGINT NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  pathology_id BIGINT NOT NULL,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prescription_pathology (prescription_id, pathology_id),
  KEY prescription_id (prescription_id),
  KEY pathology_id (pathology_id),
  CONSTRAINT prescription_pathology_ibfk_1
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE,
  CONSTRAINT prescription_pathology_ibfk_2
    FOREIGN KEY (pathology_id) REFERENCES pathology_master (id)
);

CREATE TABLE prescription_modalities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  modality_id BIGINT NOT NULL,
  charge DECIMAL(10,2) DEFAULT 0.00,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prescription_modality (prescription_id, modality_id),
  KEY prescription_id (prescription_id),
  KEY modality_id (modality_id),
  CONSTRAINT prescription_modalities_ibfk_1
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE,
  CONSTRAINT prescription_modalities_ibfk_2
    FOREIGN KEY (modality_id) REFERENCES treatment_modalities_master (id)
);

CREATE TABLE prescription_discounts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  no_of_sessions INT DEFAULT NULL,
  essential_charge DECIMAL(10,2) DEFAULT NULL,
  advanced_charge DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY prescription_id (prescription_id),
  CONSTRAINT prescription_discounts_ibfk_1
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE
);

-- Seed master data
INSERT INTO investigation_categories (name) VALUES ('X-Ray');

SET @xray_category_id = LAST_INSERT_ID();

INSERT INTO investigations_master (category_id, name) VALUES
  (@xray_category_id, 'Cervical Spine AP/Lat View'),
  (@xray_category_id, 'Lumbar Spine AP/Lat View');

INSERT INTO pathology_master (name) VALUES
  ('CBC'),
  ('ESR'),
  ('CRP');

INSERT INTO treatment_modalities_master (category, name) VALUES
  ('STANDARD', 'Thermotherapy Hot / Cold'),
  ('STANDARD', 'Therapeutic Ultrasound'),
  ('STANDARD', 'Nerve Stimulation (TENS)'),
  ('ADVANCED', 'Pulsed Electro Magnetic Field (PEMF)'),
  ('ADVANCED', 'Terahertz Therapy (THz)'),
  ('THERAPEUTIC', 'ROM Exercises'),
  ('THERAPEUTIC', 'Stretching Exercises'),
  ('THERAPEUTIC', 'Strengthening Exercises'),
  ('ADDON', 'Dry Needling'),
  ('ADDON', 'Cupping Therapy - Dry / Wet / Massage'),
  ('ADDON', 'Kinesio Taping / Pain Patch');
