
CREATE DATABASE IF NOT EXISTS railway;
USE railway;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'superadmin', 'technician') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_name (name)
);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  job_type ENUM('Installation', 'Service') NOT NULL,
  start_date DATE,
  technician VARCHAR(255),
  status ENUM('Ongoing', 'Completed') DEFAULT 'Ongoing',
  payment_status ENUM('Pending', '1/3rd Received', '2/3rd Received', 'Fully Received') DEFAULT 'Pending',
  copper_piping_cost DECIMAL(10, 2) DEFAULT 0.00,
  outdoor_fitting_cost DECIMAL(10, 2) DEFAULT 0.00,
  commissioning_cost DECIMAL(10, 2) DEFAULT 0.00,
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_job_technician (technician),
  INDEX idx_job_type (job_type)
);

-- Job Phases Table
CREATE TABLE IF NOT EXISTS job_phases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT,
  phase_name VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  phase_order INT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('Cash', 'Card', 'Transfer', 'Other') DEFAULT 'Transfer',
  notes TEXT,
  recorded_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  INDEX idx_payment_job (job_id)
);

-- Seed Initial Superadmin (Email: hsd@icloud.com, Password: 123)
INSERT IGNORE INTO users (email, password_hash, role) 
VALUES ('hsd@icloud.com', '123', 'superadmin');
