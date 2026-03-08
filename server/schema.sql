CREATE DATABASE IF NOT EXISTS railway;
USE railway;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `drawing_url` varchar(255) DEFAULT NULL,
  `quotation_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_name` (`name`)
);

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
);

CREATE TABLE IF NOT EXISTS `inventory_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inventory_id` int(11) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `action_type` enum('ADDED_STOCK','SOLD_STOCK','UPDATED_DETAILS') NOT NULL,
  `quantity_change` int(11) DEFAULT 0,
  `previous_quantity` int(11) NOT NULL,
  `new_quantity` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_history_inventory` (`inventory_id`),
  KEY `idx_history_user` (`user_email`),
  CONSTRAINT `inventory_history_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `job_type` enum('Installation','Service') NOT NULL,
  `start_date` date DEFAULT NULL,
  `technician` varchar(255) DEFAULT NULL,
  `status` enum('Ongoing','Completed') DEFAULT 'Ongoing',
  `payment_status` enum('Pending','1/3rd Received','2/3rd Received','Fully Received') DEFAULT 'Pending',
  `copper_piping_cost` decimal(10,2) DEFAULT 0.00,
  `outdoor_fitting_cost` decimal(10,2) DEFAULT 0.00,
  `commissioning_cost` decimal(10,2) DEFAULT 0.00,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `idx_job_technician` (`technician`),
  KEY `idx_job_type` (`job_type`),
  CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `job_phases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `phase_name` varchar(255) NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `completed_at` datetime DEFAULT NULL,
  `phase_order` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `job_phases_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Cash','Card','Transfer','Other') DEFAULT 'Transfer',
  `notes` text DEFAULT NULL,
  `recorded_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_payment_job` (`job_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','superadmin','technician') DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
);

-- Seed Initial Superadmin (Email: hsd@icloud.com, Password: 123)
-- This insertion ignores duplicates since the email column is unique
INSERT IGNORE INTO `users` (`email`, `password_hash`, `role`) 
VALUES ('hsd@icloud.com', '$2a$10$w0f5uA.zU3H/I95H1O7Z/eyw7x3sJ4Z1sW4eA7h/x8sK3X5e4A8sS', 'superadmin');

