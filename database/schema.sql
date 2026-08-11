-- Clinic Platform - Full schema
-- Roles: ADMIN (Super Admin), CLINIC, PATIENT

CREATE DATABASE IF NOT EXISTS clinic_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clinic_db;

CREATE TABLE IF NOT EXISTS branches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  clinic_code VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  contact_no VARCHAR(20) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  doctor_name VARCHAR(150) DEFAULT NULL,
  state_council_registration_no VARCHAR(100) DEFAULT NULL,
  gstin VARCHAR(30) DEFAULT NULL,
  logo_file VARCHAR(255) DEFAULT NULL,
  letterhead_header_file VARCHAR(255) DEFAULT NULL,
  letterhead_footer_file VARCHAR(255) DEFAULT NULL,
  id_card_background_file VARCHAR(255) DEFAULT NULL,
  license_file VARCHAR(255) DEFAULT NULL,
  approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
  created_by_admin_id INT UNSIGNED DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branches_clinic_code (clinic_code),
  KEY idx_branches_approval (approval_status),
  KEY idx_branches_created_by (created_by_admin_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  mobile VARCHAR(20) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('PATIENT', 'ADMIN', 'CLINIC') NOT NULL DEFAULT 'PATIENT',
  branch_id INT UNSIGNED DEFAULT NULL,
  patient_id INT UNSIGNED DEFAULT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  email_verification_token VARCHAR(64) DEFAULT NULL,
  email_verification_expires TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_mobile (mobile),
  KEY idx_users_role (role),
  KEY idx_users_branch_id (branch_id),
  CONSTRAINT fk_users_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_refresh_tokens_user_id (user_id),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  name VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  duration_days INT UNSIGNED NOT NULL DEFAULT 30,
  max_patients INT UNSIGNED DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  branch_id INT UNSIGNED NOT NULL,
  package_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_by_admin_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_branch_subscriptions_branch (branch_id),
  CONSTRAINT fk_branch_subscriptions_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_branch_subscriptions_package
    FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS patients (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  file_number VARCHAR(50) NOT NULL,
  patient_code VARCHAR(30) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  age TINYINT UNSIGNED DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  disease_problem VARCHAR(255) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  package_name VARCHAR(150) DEFAULT NULL,
  total_sessions INT UNSIGNED NOT NULL DEFAULT 0,
  sessions_remaining INT UNSIGNED NOT NULL DEFAULT 0,
  start_date DATE DEFAULT NULL,
  last_attendance_date DATE DEFAULT NULL,
  branch_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED DEFAULT NULL,
  created_by_manager_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patients_file_branch (file_number, branch_id),
  UNIQUE KEY uq_patients_code (patient_code),
  KEY idx_patients_branch (branch_id),
  KEY idx_patients_mobile (mobile_number),
  CONSTRAINT fk_patients_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_patients_manager
    FOREIGN KEY (created_by_manager_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_patient
  FOREIGN KEY (patient_id) REFERENCES patients(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS attendance_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  patient_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('PRESENT','ABSENT','LATE') NOT NULL DEFAULT 'PRESENT',
  scheduled_time TIME DEFAULT NULL,
  actual_time TIME DEFAULT NULL,
  session_deducted TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(255) DEFAULT NULL,
  marked_by_manager_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_patient_date (patient_id, attendance_date),
  KEY idx_attendance_branch_date (branch_id, attendance_date),
  CONSTRAINT fk_attendance_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recharge_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  patient_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  sessions_added INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  package_name VARCHAR(150) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by_manager_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recharge_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_recharge_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patient_file_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  patient_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  entry_type ENUM('NOTE','PRESCRIPTION','PROGRESS','PAYMENT','SESSION') NOT NULL DEFAULT 'NOTE',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_by_manager_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_file_entry_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manager_time_tables (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  branch_id INT UNSIGNED NOT NULL,
  day_of_week ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  doctor_name VARCHAR(150) DEFAULT NULL,
  room_no VARCHAR(50) DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  created_by_manager_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_time_table_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manager_queries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  branch_id INT UNSIGNED NOT NULL,
  created_by_manager_id INT UNSIGNED NOT NULL,
  patient_file_number VARCHAR(50) DEFAULT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN','IN_PROGRESS','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_queries_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

INSERT INTO subscription_packages (name, description, price, duration_days, max_patients)
VALUES
  ('Starter', 'Basic clinic plan', 999.00, 30, 100),
  ('Professional', 'Growing clinic plan', 2499.00, 30, 500),
  ('Enterprise', 'Unlimited patients', 4999.00, 30, NULL);

INSERT INTO branches (clinic_code, name, address, phone, approval_status)
VALUES ('CLN-0001', 'Main Clinic', '123 Health Street', '9876543210', 'APPROVED');

INSERT INTO users (name, email, password, role, email_verified)
VALUES (
  'System Admin',
  'admin@clinic.com',
  '$2b$10$mcTosY4jCv30g/S2NCJ7SugxCApwjRa32I8lTre1KDXiSEQmmiaay',
  'ADMIN',
  1
);


CREATE TABLE service_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    cat_name VARCHAR(50) NOT NULL,
    category_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    added_by INT UNSIGNED NOT NULL,
    clinic_id INT UNSIGNED NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_cat_added_by
        FOREIGN KEY (added_by)
        REFERENCES users(id),

    CONSTRAINT fk_service_cat_clinic
        FOREIGN KEY (clinic_id)
        REFERENCES branches(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_category_fee
        CHECK (category_fee >= 0),

    UNIQUE KEY uk_service_cat_clinic_name (clinic_id, cat_name),

    INDEX idx_service_cat_clinic_id (clinic_id),
    INDEX idx_service_cat_added_by (added_by),
    INDEX idx_service_cat_active (is_active)
);


CREATE TABLE service_sub_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    category_id INT UNSIGNED NOT NULL,

    sub_category_name VARCHAR(100) NOT NULL,

    sub_category_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    added_by INT UNSIGNED NOT NULL,

    clinic_id INT UNSIGNED NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sub_category_parent
        FOREIGN KEY (category_id)
        REFERENCES service_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sub_category_added_by
        FOREIGN KEY (added_by)
        REFERENCES users(id),

    CONSTRAINT fk_sub_category_clinic
        FOREIGN KEY (clinic_id)
        REFERENCES branches(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sub_category_fee
        CHECK (sub_category_fee >= 0),

    UNIQUE KEY uk_sub_category_name (
        clinic_id,
        category_id,
        sub_category_name
    ),

    INDEX idx_sub_category_category_id (category_id),
    INDEX idx_sub_category_clinic_id (clinic_id),
    INDEX idx_sub_category_active (is_active)
);


CREATE TABLE services (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    cat_id INT UNSIGNED NOT NULL,
    sub_cat_id INT UNSIGNED NOT NULL,

    service_name VARCHAR(100) NOT NULL,

    service_type ENUM('M','T') NOT NULL COMMENT 'M=Machine, T=Therapy',

    standard_price DECIMAL(9,2) NOT NULL DEFAULT 0.00,

    advance_price DECIMAL(9,2) NOT NULL DEFAULT 0.00,

    price_sub_cat_id INT UNSIGNED NULL,

    clinic_id INT UNSIGNED NOT NULL,

    added_by INT UNSIGNED NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_services_category
        FOREIGN KEY (cat_id)
        REFERENCES service_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_services_sub_category
        FOREIGN KEY (sub_cat_id)
        REFERENCES service_sub_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_services_price_sub_category
        FOREIGN KEY (price_sub_cat_id)
        REFERENCES service_sub_categories(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_services_clinic
        FOREIGN KEY (clinic_id)
        REFERENCES branches(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_services_added_by
        FOREIGN KEY (added_by)
        REFERENCES users(id),

    CONSTRAINT chk_standard_price
        CHECK (standard_price >= 0),

    CONSTRAINT chk_advance_price
        CHECK (advance_price >= 0),

    UNIQUE KEY uk_service_name (
        clinic_id,
        sub_cat_id,
        service_name
    ),

    INDEX idx_services_category (cat_id),
    INDEX idx_services_sub_category (sub_cat_id),
    INDEX idx_services_clinic (clinic_id),
    INDEX idx_services_active (is_active)
);


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

CREATE TABLE IF NOT EXISTS investigation_categories (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_investigation_category_name (name)
);

CREATE TABLE IF NOT EXISTS investigations_master (
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

CREATE TABLE IF NOT EXISTS pathology_master (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS treatment_modalities_master (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category ENUM('STANDARD','ADVANCED','THERAPEUTIC','ADDON') NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_modality_category (category)
);

CREATE TABLE IF NOT EXISTS prescriptions (
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

CREATE TABLE IF NOT EXISTS prescription_patient_snapshot (
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

CREATE TABLE IF NOT EXISTS prescription_investigations (
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

CREATE TABLE IF NOT EXISTS prescription_pathology (
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

CREATE TABLE IF NOT EXISTS prescription_modalities (
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

CREATE TABLE IF NOT EXISTS prescription_discounts (
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

INSERT IGNORE INTO investigation_categories (name) VALUES ('X-Ray');

SET @xray_category_id = (SELECT id FROM investigation_categories WHERE name = 'X-Ray' LIMIT 1);

INSERT IGNORE INTO investigations_master (category_id, name) VALUES
  (@xray_category_id, 'Cervical Spine AP/Lat View'),
  (@xray_category_id, 'Lumbar Spine AP/Lat View');

INSERT IGNORE INTO pathology_master (name) VALUES
  ('CBC'),
  ('ESR'),
  ('CRP');

INSERT IGNORE INTO treatment_modalities_master (category, name) VALUES
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


  CREATE TABLE treatment_protocols (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    branch_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE treatment_protocol_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    protocol_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY(protocol_id)
    REFERENCES treatment_protocols(id)
    ON DELETE CASCADE
);

CREATE TABLE template_settings (

    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    branch_id INT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,

    description TEXT DEFAULT NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_by INT UNSIGNED DEFAULT NULL,

    updated_by INT UNSIGNED DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_template_name (branch_id, name),

    KEY idx_template_branch (branch_id),

    CONSTRAINT fk_template_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)

);


CREATE TABLE template_setting_items (

    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    template_id INT UNSIGNED NOT NULL,

    title VARCHAR(255) NOT NULL,

    description TEXT DEFAULT NULL,

    sort_order INT NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_template_items (template_id),

    CONSTRAINT fk_template_item
        FOREIGN KEY (template_id)
        REFERENCES template_settings(id)
        ON DELETE CASCADE

);