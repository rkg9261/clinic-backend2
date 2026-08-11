-- Add payment and document fields to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0 AFTER notes,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'CASH' AFTER amount,
ADD COLUMN IF NOT EXISTS document_file VARCHAR(255) DEFAULT NULL AFTER payment_method,
ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'STANDARD' AFTER document_file;
