-- ============================================================
-- CoolBreeze AC Automation — Full Schema
-- Target Database: jqckozpd_coolbreeze_ac  (cPanel / shared hosting)
-- Updated: 2026-06-23
-- ============================================================

-- On cPanel the database is pre-created via MySQL Databases wizard,
-- so we just USE it rather than CREATE DATABASE.
USE `jqckozpd_coolbreeze_ac`;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------
-- 1. Users
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','superadmin','technician') DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 2. Refresh Tokens  (added by security hardening)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 3. Customers
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `drawing_url` varchar(255) DEFAULT NULL,
  `quotation_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customer_name` (`name`),
  KEY `idx_customers_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 4. Inventory (AC units)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model_name` varchar(255) NOT NULL,
  `brand` enum('Mitsubishi','Akabishi') NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `tonnage` varchar(50) DEFAULT NULL,
  `star_rating` varchar(50) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `sold_quantity` int(11) DEFAULT 0,
  `our_price` decimal(10,2) DEFAULT 0.00,
  `sale_price` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_inventory_brand` (`brand`),
  KEY `idx_inventory_model` (`model_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 5. Inventory Copper
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_copper` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `size` varchar(20) NOT NULL,
  `group_name` varchar(50) NOT NULL DEFAULT 'Standard Sizes',
  `total_in_stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `size` (`size`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 6. Copper Warehouse Logs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copper_warehouse_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `size` varchar(20) NOT NULL,
  `sent_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `return_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cwl_size` FOREIGN KEY (`size`) REFERENCES `inventory_copper` (`size`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 7. Jobs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `job_type` enum('Installation','Service') NOT NULL,
  `start_date` date DEFAULT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `status` enum('Ongoing','Completed') DEFAULT 'Ongoing',
  `payment_status` enum('Pending','1/3rd Received','2/3rd Received','Fully Received') DEFAULT 'Pending',
  `copper_piping_cost` decimal(10,2) DEFAULT 0.00,
  `outdoor_fitting_cost` decimal(10,2) DEFAULT 0.00,
  `commissioning_cost` decimal(10,2) DEFAULT 0.00,
  `equipment_cost` decimal(10,2) DEFAULT 0.00,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `idx_job_type` (`job_type`),
  KEY `idx_jobs_deleted` (`deleted_at`),
  CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 8. Job Phases  (with email_status column)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `job_phases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `phase_name` varchar(255) NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `completed_at` datetime DEFAULT NULL,
  `phase_order` int(11) DEFAULT NULL,
  `email_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `job_phases_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 9. Payments
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `category` enum('Low-Side','Equipment') DEFAULT 'Low-Side',
  `payment_method` enum('Cash','Card','Transfer','Other') DEFAULT 'Transfer',
  `notes` text DEFAULT NULL,
  `recorded_by_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_payment_job` (`job_id`),
  KEY `idx_pay_created` (`created_at`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_recorded_by` FOREIGN KEY (`recorded_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 10. Inventory History  (with job_id + RETURNED_STOCK enum)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inventory_id` int(11) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `action_type` enum('ADDED_STOCK','SOLD_STOCK','UPDATED_DETAILS','RETURNED_STOCK') NOT NULL,
  `quantity_change` int(11) DEFAULT 0,
  `previous_quantity` int(11) NOT NULL,
  `new_quantity` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_history_inventory` (`inventory_id`),
  KEY `idx_history_user` (`user_email`),
  KEY `idx_history_job` (`job_id`),
  KEY `idx_ih_created` (`created_at`),
  CONSTRAINT `inventory_history_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_history_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 11. Daily Work Logs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_work_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `work_description` text DEFAULT NULL,
  `qty` varchar(50) DEFAULT '0',
  `technician_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_job` (`job_id`),
  KEY `idx_dwl_date_tech` (`date`, `technician_id`),
  CONSTRAINT `daily_work_logs_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dwl_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 12. Material Logs  (with ac_model enum value)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `material_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `category` enum('copper','drain','remote','other','ac_model') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `sent_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `return_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `used_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ml_job_date` (`job_id`, `date`),
  KEY `idx_ml_cat_date` (`category`, `date`),
  CONSTRAINT `fk_ml_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 13. Material Logs V2 (new material logging system)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `material_log_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_log_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `sent_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `used_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `returned_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mli_log` (`material_log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 14. Settings
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` varchar(255) NOT NULL,
  `value_type` enum('string','integer','boolean','json') NOT NULL DEFAULT 'string',
  `setting_value` text NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------
-- 15. Job Cost Summary View
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW `job_cost_summary` AS
SELECT
  j.id                                                         AS job_id,
  j.total_cost                                                 AS quoted_total,
  COALESCE(SUM(p.amount), 0)                                   AS total_received,
  j.total_cost - COALESCE(SUM(p.amount), 0)                   AS balance_due,
  COALESCE(copper.net_feet, 0)                                 AS net_copper_feet_used
FROM jobs j
LEFT JOIN payments p
  ON p.job_id = j.id
LEFT JOIN (
  SELECT job_id,
         SUM(sent_qty - return_qty) AS net_feet
  FROM material_logs
  WHERE category = 'copper'
  GROUP BY job_id
) copper ON copper.job_id = j.id
GROUP BY j.id, j.total_cost, copper.net_feet;

-- ---------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------

-- Default copper pipe sizes
INSERT IGNORE INTO `inventory_copper` (`size`, `total_in_stock`) VALUES
('1/4', 0.00),
('3/8', 0.00),
('1/2', 0.00),
('5/8', 0.00),
('3/4', 0.00);

-- Default settings
INSERT IGNORE INTO `settings` (`setting_key`, `value_type`, `setting_value`) VALUES
('mail_transport', 'string', 'smtp'),
('company_phone', 'string', '95922 92292'),
('company_email', 'string', 'contactsatguruengineer@gmail.com');

-- NOTE: The superadmin user is seeded automatically by the Node.js server
-- using the DEFAULT_ADMIN_PASSWORD environment variable (bcrypt hashed at runtime).
-- Do NOT hardcode a password hash here for security reasons.

SET FOREIGN_KEY_CHECKS = 1;
