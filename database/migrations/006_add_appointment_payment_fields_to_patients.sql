-- Add appointment type and payment breakdown fields to patients table
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(50) DEFAULT 'STANDARD' AFTER gender,
  ADD COLUMN IF NOT EXISTS cash_amount DECIMAL(12,2) DEFAULT 0 AFTER amount,
  ADD COLUMN IF NOT EXISTS upi_amount DECIMAL(12,2) DEFAULT 0 AFTER cash_amount,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0 AFTER upi_amount;
