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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `daily_work_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `work_description` text DEFAULT NULL,
  `qty` varchar(50) DEFAULT '0',
  `technician` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_copper_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `size` varchar(20) NOT NULL,
  `sent_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `return_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `used_qty` decimal(10,2) GENERATED ALWAYS AS (`sent_qty` - `return_qty`) STORED,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `material_copper_logs_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_drain_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `used_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `material_drain_logs_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_log_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_log_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `sent_qty` decimal(10,2) DEFAULT 0.00,
  `used_qty` decimal(10,2) DEFAULT 0.00,
  `returned_qty` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `material_log_id` (`material_log_id`),
  CONSTRAINT `material_log_items_ibfk_1` FOREIGN KEY (`material_log_id`) REFERENCES `material_logs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_type` enum('COPPER','DRAIN PIPE','REMOTE','OTHER') NOT NULL,
  `date` date NOT NULL,
  `technician_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_material_log_type` (`material_type`),
  KEY `idx_material_log_tech` (`technician_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_other_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `description` varchar(255) NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `material_other_logs_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `material_remote_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'wired',
  `used_qty` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `material_remote_logs_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','superadmin','technician') DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed Initial Superadmin (Email: hsd@icloud.com, Password: 123)
-- This insertion ignores duplicates since the email column is unique
INSERT IGNORE INTO `users` (`email`, `password_hash`, `role`) 
VALUES ('hsd@icloud.com', '$2a$10$w0f5uA.zU3H/I95H1O7Z/eyw7x3sJ4Z1sW4eA7h/x8sK3X5e4A8sS', 'superadmin');
