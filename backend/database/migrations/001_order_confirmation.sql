ALTER TABLE orders
  ADD COLUMN customer_name VARCHAR(100) NULL AFTER order_number,
  ADD COLUMN customer_email VARCHAR(150) NULL AFTER customer_name,
  ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER customer_email,
  ADD COLUMN delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal,
  ADD COLUMN confirmation_email_sent BOOLEAN NOT NULL DEFAULT FALSE AFTER updated_at,
  ADD COLUMN confirmation_email_sent_at TIMESTAMP NULL AFTER confirmation_email_sent,
  ADD COLUMN confirmation_email_error VARCHAR(255) NULL AFTER confirmation_email_sent_at,
  ADD COLUMN payfast_payment_id VARCHAR(100) NULL AFTER confirmation_email_error;
