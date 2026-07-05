import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

async function safeAlter(sql: string, label?: string) {
  try {
    await pool.execute(sql);
    if (label) console.log(`Migration applied: ${label}`);
  } catch (err: any) {
    // Column/constraint might already exist — safe to ignore
  }
}

export async function ensureDatabaseReady() {
  try {
    console.log("Initializing database schema...");

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'superadmin', 'technician') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(20),
        address TEXT,
        drawing_url VARCHAR(255),
        quotation_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_customer_name (name),
        INDEX idx_customers_deleted (deleted_at)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        job_type ENUM('Installation', 'Service') NOT NULL,
        start_date DATE,
        technician_id INT NULL,
        status ENUM('Ongoing', 'Completed') DEFAULT 'Ongoing',
        payment_status ENUM('Pending', '1/3rd Received', '2/3rd Received', 'Fully Received') DEFAULT 'Pending',
        copper_piping_cost DECIMAL(10, 2) DEFAULT 0.00,
        outdoor_fitting_cost DECIMAL(10, 2) DEFAULT 0.00,
        commissioning_cost DECIMAL(10, 2) DEFAULT 0.00,
        equipment_cost DECIMAL(10, 2) DEFAULT 0.00,
        total_cost DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_job_type (job_type),
        INDEX idx_jobs_deleted (deleted_at)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS job_phases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT,
        phase_name VARCHAR(255) NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        phase_order INT,
        email_status VARCHAR(50) DEFAULT NULL,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT,
        amount DECIMAL(10, 2) NOT NULL,
        category ENUM('Low-Side', 'Equipment') DEFAULT 'Low-Side',
        payment_method ENUM('Cash', 'Card', 'Transfer', 'Other') DEFAULT 'Transfer',
        notes TEXT,
        recorded_by_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_payment_job (job_id),
        INDEX idx_pay_created (created_at)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        model_name VARCHAR(255) NOT NULL,
        brand ENUM('Mitsubishi', 'Akabishi') NOT NULL,
        type VARCHAR(50),
        tonnage VARCHAR(50),
        star_rating VARCHAR(50),
        quantity INT DEFAULT 0,
        sold_quantity INT DEFAULT 0,
        our_price DECIMAL(10, 2) DEFAULT 0.00,
        sale_price DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inventory_brand (brand),
        INDEX idx_inventory_model (model_name)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        action_type ENUM('ADDED_STOCK', 'SOLD_STOCK', 'UPDATED_DETAILS', 'RETURNED_STOCK') NOT NULL,
        quantity_change INT DEFAULT 0,
        previous_quantity INT NOT NULL,
        new_quantity INT NOT NULL,
        job_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
        INDEX idx_history_inventory (inventory_id),
        INDEX idx_history_user (user_email),
        INDEX idx_history_job (job_id),
        INDEX idx_ih_created (created_at)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory_copper (
        id INT AUTO_INCREMENT PRIMARY KEY,
        size VARCHAR(20) UNIQUE NOT NULL,
        total_in_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Alter table to add group_name column if it doesn't exist
    await safeAlter("ALTER TABLE inventory_copper ADD COLUMN group_name VARCHAR(50) NOT NULL DEFAULT 'Standard Sizes'", 'group_name on inventory_copper');

    // Alter table to add phone column to users if it doesn't exist
    await safeAlter("ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL", 'phone on users');

    // Create password_resets table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        otp_expires_at DATETIME NOT NULL,
        reset_token VARCHAR(255) NULL,
        reset_token_expires_at DATETIME NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Alter table to add email_status column to job_phases if it doesn't exist
    await safeAlter("ALTER TABLE job_phases ADD COLUMN email_status VARCHAR(50) DEFAULT NULL", 'email_status on job_phases');

    // Alter table to add whatsapp_status column to job_phases if it doesn't exist
    await safeAlter("ALTER TABLE job_phases ADD COLUMN whatsapp_status VARCHAR(50) DEFAULT NULL", 'whatsapp_status on job_phases');

    // Alter table to add whatsapp_message_id column to job_phases if it doesn't exist
    await safeAlter("ALTER TABLE job_phases ADD COLUMN whatsapp_message_id VARCHAR(255) DEFAULT NULL", 'whatsapp_message_id on job_phases');

    // Migration: Update group_name for existing items that contain 'home'
    try {
      const [rows]: any = await pool.execute('SELECT id, size FROM inventory_copper');
      for (const row of rows) {
        if (row.size.toLowerCase().includes('home')) {
          let cleanSize = row.size.replace(/^(Homes|Home)\s+/i, '').trim();
          try {
            await pool.execute(
              "UPDATE inventory_copper SET group_name = 'Home Sizes', size = ? WHERE id = ?",
              [cleanSize, row.id]
            );
            await pool.execute(
              "UPDATE material_logs SET description = ? WHERE description = ? AND category = 'copper'",
              [cleanSize, row.size]
            );
          } catch (err) {
            await pool.execute(
              "UPDATE inventory_copper SET group_name = 'Home Sizes' WHERE id = ?",
              [row.id]
            );
          }
        }
      }
    } catch (err) {
      console.error('Migration failed:', err);
    }

    await pool.execute(`
      INSERT IGNORE INTO inventory_copper (size, total_in_stock) VALUES
      ('1/4', 0.00),
      ('3/8', 0.00),
      ('1/2', 0.00),
      ('5/8', 0.00),
      ('3/4', 0.00)
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS copper_warehouse_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        size VARCHAR(20) NOT NULL,
        sent_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        return_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_cwl_size FOREIGN KEY (size) REFERENCES inventory_copper(size) ON UPDATE CASCADE ON DELETE CASCADE
      )
    `);

    // Ensure fk_cwl_size is ON DELETE CASCADE for existing installations
    try {
      await pool.execute('ALTER TABLE copper_warehouse_logs DROP FOREIGN KEY fk_cwl_size');
    } catch (err) {
      // Ignore if constraint does not exist
    }
    try {
      await pool.execute(`
        ALTER TABLE copper_warehouse_logs 
        ADD CONSTRAINT fk_cwl_size 
        FOREIGN KEY (size) REFERENCES inventory_copper(size) 
        ON UPDATE CASCADE ON DELETE CASCADE
      `);
      console.log('Successfully updated fk_cwl_size constraint to ON DELETE CASCADE');
    } catch (err: any) {
      console.error('Failed to update fk_cwl_size constraint:', err.message);
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS daily_work_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT DEFAULT NULL,
        date DATE NOT NULL,
        work_description TEXT,
        qty VARCHAR(50) DEFAULT '0',
        technician_id INT NULL,
        remarks TEXT DEFAULT NULL,
        address VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_job (job_id),
        INDEX idx_dwl_date_tech (date, technician_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS cash_flow (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        received DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        from_source VARCHAR(255) NOT NULL DEFAULT '',
        expenditure DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        on_source VARCHAR(255) NOT NULL DEFAULT '',
        sent_home DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS material_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,
        date DATE NOT NULL,
        category ENUM('copper', 'drain', 'remote', 'other') NOT NULL,
        description VARCHAR(255) NULL,
        sent_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        return_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        used_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ml_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        INDEX idx_ml_job_date (job_id, date),
        INDEX idx_ml_cat_date (category, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS material_log_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_log_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        sent_qty DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        used_qty DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        returned_qty DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        notes TEXT DEFAULT NULL,
        INDEX idx_mli_log (material_log_id),
        CONSTRAINT fk_mli_log FOREIGN KEY (material_log_id) REFERENCES material_logs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await safeAlter("ALTER TABLE material_logs MODIFY COLUMN category ENUM('copper', 'drain', 'remote', 'other', 'ac_model') NOT NULL", 'ac_model enum on material_logs');

    await safeAlter("ALTER TABLE inventory_history ADD COLUMN job_id INT DEFAULT NULL", 'job_id on inventory_history');
    await safeAlter("ALTER TABLE inventory_history ADD CONSTRAINT fk_inv_history_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL", 'fk_inv_history_job');

    await safeAlter("ALTER TABLE inventory_history MODIFY COLUMN action_type ENUM('ADDED_STOCK', 'SOLD_STOCK', 'UPDATED_DETAILS', 'RETURNED_STOCK') NOT NULL", 'RETURNED_STOCK enum on inventory_history');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        value_type ENUM('string', 'integer', 'boolean', 'json') NOT NULL DEFAULT 'string',
        setting_value TEXT NOT NULL
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        header TEXT,
        body TEXT NOT NULL,
        footer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE OR REPLACE VIEW job_cost_summary AS
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
      GROUP BY j.id, j.total_cost, copper.net_feet
    `);

    // Insert Default Mail Transport Setting
    await pool.execute(
      `INSERT IGNORE INTO settings (setting_key, value_type, setting_value) VALUES (?, ?, ?)`,
      ['mail_transport', 'string', 'smtp']
    );

    // Insert Default Company Contact Settings
    await pool.execute(
      `INSERT IGNORE INTO settings (setting_key, value_type, setting_value) VALUES (?, ?, ?)`,
      ['company_phone', 'string', '95922 92292']
    );
    await pool.execute(
      `INSERT IGNORE INTO settings (setting_key, value_type, setting_value) VALUES (?, ?, ?)`,
      ['company_email', 'string', 'contactsatguruengineer@gmail.com']
    );

    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultAdminPassword || defaultAdminPassword.length < 12) {
      console.warn("WARNING: DEFAULT_ADMIN_PASSWORD is not set or is less than 12 characters. Skipping default superadmin seed.");
    } else {
      const hashedDefaultPassword = await bcrypt.hash(defaultAdminPassword, 12);
      await pool.execute(
        `INSERT IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
        ['hsd@icloud.com', hashedDefaultPassword, 'superadmin']
      );
    }

    // Ensure created_by column exists in daily_work_logs table
    await safeAlter("ALTER TABLE daily_work_logs ADD COLUMN created_by INT NULL", 'created_by on daily_work_logs');
    await safeAlter("ALTER TABLE daily_work_logs ADD CONSTRAINT fk_dwl_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL", 'fk_dwl_created_by');

    console.log("Database schema ready.");
  } catch (err: any) {
    console.error("Database initialization error:", err.message);
  }
}
