-- ===============================================================
-- COOLBREEZE AC DATABASE INITIALIZATION SCRIPT
-- Setup schema, tables, views, default settings, and admin user
-- ===============================================================

CREATE DATABASE IF NOT EXISTS `coolbreeze_ac`;
USE `coolbreeze_ac`;

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','superadmin','technician') DEFAULT 'admin',
  `phone` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `refresh_tokens`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `fk_rt_user` (`user_id`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `customers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `drawing_url` VARCHAR(255) DEFAULT NULL,
  `quotation_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customer_name` (`name`),
  KEY `idx_customers_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `inventory`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `model_name` VARCHAR(255) NOT NULL,
  `brand` ENUM('Mitsubishi','Akabishi') NOT NULL,
  `type` VARCHAR(50) DEFAULT NULL,
  `tonnage` VARCHAR(50) DEFAULT NULL,
  `star_rating` VARCHAR(50) DEFAULT NULL,
  `quantity` INT(11) DEFAULT 0,
  `sold_quantity` INT(11) DEFAULT 0,
  `our_price` DECIMAL(10,2) DEFAULT 0.00,
  `sale_price` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_inventory_brand` (`brand`),
  KEY `idx_inventory_model` (`model_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `inventory_copper`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_copper` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `size` VARCHAR(20) NOT NULL,
  `group_name` VARCHAR(50) NOT NULL DEFAULT 'Standard Sizes',
  `total_in_stock` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `size` (`size`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `copper_warehouse_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `copper_warehouse_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `size` VARCHAR(20) NOT NULL,
  `sent_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `return_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `fk_cwl_size` (`size`),
  CONSTRAINT `fk_cwl_size` FOREIGN KEY (`size`) REFERENCES `inventory_copper` (`size`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `jobs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `customer_id` INT(11) DEFAULT NULL,
  `job_type` ENUM('Installation','Service') NOT NULL,
  `start_date` DATE DEFAULT NULL,
  `technician_id` INT(11) DEFAULT NULL,
  `status` ENUM('Ongoing','Completed') DEFAULT 'Ongoing',
  `payment_status` ENUM('Pending','1/3rd Received','2/3rd Received','Fully Received') DEFAULT 'Pending',
  `copper_piping_cost` DECIMAL(10,2) DEFAULT 0.00,
  `outdoor_fitting_cost` DECIMAL(10,2) DEFAULT 0.00,
  `commissioning_cost` DECIMAL(10,2) DEFAULT 0.00,
  `equipment_cost` DECIMAL(10,2) DEFAULT 0.00,
  `total_cost` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `idx_job_type` (`job_type`),
  KEY `idx_jobs_deleted` (`deleted_at`),
  KEY `fk_job_technician` (`technician_id`),
  CONSTRAINT `fk_job_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `job_phases`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `job_phases` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) DEFAULT NULL,
  `phase_name` VARCHAR(255) NOT NULL,
  `is_completed` TINYINT(1) DEFAULT 0,
  `completed_at` DATETIME DEFAULT NULL,
  `phase_order` INT(11) DEFAULT NULL,
  `email_status` VARCHAR(50) DEFAULT NULL,
  `whatsapp_status` VARCHAR(50) DEFAULT NULL,
  `whatsapp_message_id` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `job_phases_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `payments`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `category` ENUM('Low-Side','Equipment') DEFAULT 'Low-Side',
  `payment_method` ENUM('Cash','Card','Transfer','Other') DEFAULT 'Transfer',
  `notes` TEXT DEFAULT NULL,
  `recorded_by_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_payment_job` (`job_id`),
  KEY `idx_pay_created` (`created_at`),
  KEY `fk_pay_recorded_by` (`recorded_by_id`),
  CONSTRAINT `fk_pay_recorded_by` FOREIGN KEY (`recorded_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `inventory_history`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `inventory_id` INT(11) NOT NULL,
  `user_email` VARCHAR(255) NOT NULL,
  `action_type` ENUM('ADDED_STOCK','SOLD_STOCK','UPDATED_DETAILS','RETURNED_STOCK') NOT NULL,
  `quantity_change` INT(11) DEFAULT 0,
  `previous_quantity` INT(11) NOT NULL,
  `new_quantity` INT(11) NOT NULL,
  `job_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_history_inventory` (`inventory_id`),
  KEY `idx_history_user` (`user_email`),
  KEY `idx_history_job` (`job_id`),
  KEY `idx_ih_created` (`created_at`),
  CONSTRAINT `fk_inv_history_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_history_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `daily_work_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_work_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) DEFAULT NULL,
  `date` DATE NOT NULL,
  `work_description` TEXT DEFAULT NULL,
  `qty` VARCHAR(50) DEFAULT '0',
  `technician_id` INT(11) DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_job` (`job_id`),
  KEY `idx_dwl_date_tech` (`date`,`technician_id`),
  KEY `fk_dwl_technician` (`technician_id`),
  CONSTRAINT `daily_work_logs_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dwl_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(255) NOT NULL,
  `value_type` ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'string',
  `setting_value` TEXT NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `cash_flow`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cash_flow` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `received` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `from_source` VARCHAR(255) NOT NULL DEFAULT '',
  `expenditure` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `on_source` VARCHAR(255) NOT NULL DEFAULT '',
  `sent_home` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `whatsapp_templates`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_templates` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `header` TEXT DEFAULT NULL,
  `body` TEXT NOT NULL,
  `footer` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `password_resets`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `otp_expires_at` DATETIME NOT NULL,
  `reset_token` VARCHAR(255) DEFAULT NULL,
  `reset_token_expires_at` DATETIME DEFAULT NULL,
  `verified` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `material_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `material_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) NOT NULL,
  `date` DATE NOT NULL,
  `category` ENUM('copper','drain','remote','other','ac_model') NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `sent_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `return_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `used_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  KEY `idx_ml_job_date` (`job_id`,`date`),
  KEY `idx_ml_cat_date` (`category`,`date`),
  CONSTRAINT `fk_ml_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `material_log_items`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `material_log_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `material_log_id` INT(11) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `sent_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `used_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `returned_qty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mli_log` (`material_log_id`),
  CONSTRAINT `fk_mli_log` FOREIGN KEY (`material_log_id`) REFERENCES `material_logs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Structure for view `job_cost_summary`
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `job_cost_summary` AS 
SELECT 
  `j`.`id` AS `job_id`,
  `j`.`total_cost` AS `quoted_total`,
  COALESCE(SUM(`p`.`amount`), 0) AS `total_received`,
  `j`.`total_cost` - COALESCE(SUM(`p`.`amount`), 0) AS `balance_due`,
  COALESCE(`copper`.`net_feet`, 0) AS `net_copper_feet_used` 
FROM ((`jobs` `j` 
  LEFT JOIN `payments` `p` ON(`p`.`job_id` = `j`.`id`)) 
  LEFT JOIN (
    SELECT 
      `material_logs`.`job_id` AS `job_id`,
      SUM(`material_logs`.`sent_qty` - `material_logs`.`return_qty`) AS `net_feet` 
    FROM `material_logs` 
    WHERE `material_logs`.`category` = 'copper' 
    GROUP BY `material_logs`.`job_id`
  ) `copper` ON(`copper`.`job_id` = `j`.`id`)) 
GROUP BY `j`.`id`, `j`.`total_cost`, `copper`.`net_feet`;

SET FOREIGN_KEY_CHECKS = 1;

-- ===============================================================
-- DATA SEEDING (DEFAULT SETTINGS, ADMIN USER)
-- ===============================================================

-- Seed default settings
INSERT INTO `settings` (`setting_key`, `value_type`, `setting_value`) VALUES
('company_email', 'string', 'contact@satguruengineers.com'),
('company_phone', 'string', '9592292292'),
('copperPipeLowStockThreshold', 'integer', '100'),
('lowStockThreshold', 'integer', '5'),
('mail_transport', 'string', 'smtp')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Seed default superadmin (hsd@icloud.com / 123)
INSERT INTO `users` (`email`, `password_hash`, `role`) VALUES 
('hsd@icloud.com', '$2a$10$Nb4TRJCpV7.qKGsXpAaCNOw7dEPyaZK.W12Ti2HMCJeJ0e2iF2pdG', 'superadmin')
ON DUPLICATE KEY UPDATE 
  `role` = 'superadmin',
  `password_hash` = '$2a$10$Nb4TRJCpV7.qKGsXpAaCNOw7dEPyaZK.W12Ti2HMCJeJ0e2iF2pdG';
