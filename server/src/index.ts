
import express from 'express';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendEmail } from './utils/gmailMailer.js';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

// Ensure uploads dir
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })

const app = express();

const INSTALLATION_PHASES = [
  "Drain pipe", "Remote pipe", "Wall opening", "Supporting", "Copper piping (payment)",
  "Leak testing", "Dressing", "Communication wiring", "Ducting", "Indoor Unit Installation",
  "Grill fitting", "Outdoor fittings (payment)", "Pressure stand", "Vacuum",
  "Gas charging", "Remote fitting", "Commissioning (payment)"
];

const SERVICE_PHASES = [
  "Initial System Inspection",
  "Filter & Coil Cleaning",
  "Gas Level & Pressure Check",
  "Component Repair/Replacement",
  "Final Testing & Payment"
];

// --- EMAIL CONFIGURATION MOVED TO utils/gmailMailer.js ---

const sendPhaseNotification = async (customerEmail: any, customerName: any, jobType: any, phaseName: any, jobId: any, technician: any, paymentStatus: any, isFinal: any, costs: any = {}) => {
  let paymentBlock = '';

  // Check if this is a specific payment phase
  const isCopperPhase = phaseName.toLowerCase().includes('copper piping (payment)');
  const isOutdoorPhase = phaseName.toLowerCase().includes('outdoor fittings (payment)');
  const isCommissioningPhase = phaseName.toLowerCase().includes('commissioning (payment)');
  const isServiceFinalPhase = jobType === 'Service' && phaseName.toLowerCase().includes('final testing & payment');

  if (isCopperPhase || isOutdoorPhase || isCommissioningPhase || isServiceFinalPhase) {
    const amount = isCopperPhase ? costs.copperPipingCost :
      isOutdoorPhase ? costs.outdoorFittingCost :
        costs.commissioningCost; // commissioningCost is used for both commissioning phase and service final phase

    paymentBlock = `
      <div style="margin-top: 30px; padding: 20px; background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; text-align: center;">
        <h2 style="color: #9a3412; font-size: 18px; margin-bottom: 10px;">Payment Request: ${phaseName}</h2>
        <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">This phase is now complete. Please arrange the payment for this milestone.</p>
        <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c2410c;">
            Amount Due: ₹${Number(amount).toLocaleString()}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
            Current Payment Status: <strong>${paymentStatus}</strong>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
            You can pay via bank transfer or directly to the onsite technician.
          </p>
        </div>
      </div>
    `;
  } else if (isFinal) {
    paymentBlock = `
      <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border: 2px dashed #2563eb; border-radius: 12px; text-align: center;">
        <h2 style="color: #1e3a8a; font-size: 18px; margin-bottom: 10px;">Project Successfully Completed!</h2>
        <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">The final commissioning and testing phase is complete. Your system is now fully operational.</p>
        <div style="background-color: ${paymentStatus === 'Fully Received' ? '#ecfdf5' : '#fff7ed'}; border: 1px solid ${paymentStatus === 'Fully Received' ? '#10b981' : '#f97316'}; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-weight: bold; color: ${paymentStatus === 'Fully Received' ? '#065f46' : '#9a3412'};">
            Payment Status: ${paymentStatus.toUpperCase()}
          </p>
          ${paymentStatus !== 'Fully Received' ? `
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
              Please arrange for the final payment at your earliest convenience.
            </p>
          ` : `
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #065f46;">
              Thank you for your prompt payment! We hope you enjoy your newly serviced AC system.
            </p>
          `}
        </div>
      </div>
    `;
  }

  const mailOptions = {
    from: `"Satguru Engineers" <${process.env.EMAIL_USER || 'noreply@satguruengineers.com'}>`,
    to: customerEmail,
    subject: isFinal ? `Final Project Completion: Job #${jobId}` : `Update: Job #${jobId} - ${phaseName} Completed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Satguru Engineers Service Update</h1>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p>Hello <strong>${customerName}</strong>,</p>
          <p>We're writing to let you know that a key milestone in your <strong>${jobType}</strong> has been successfully completed:</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #2563eb;">Completed: ${phaseName}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Job ID: #${jobId} | Technician: ${technician}</p>
          </div>
          
          ${paymentBlock}

          <p style="margin-top: 32px;">Our team is dedicated to providing high-quality service. If you have any questions, feel free to reply to this email.</p>
          <p style="margin-top: 32px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} Satguru Engineers.
        </div>
      </div>
    `
  };

  await sendEmail(customerEmail, mailOptions.subject, mailOptions.html);
};

app.use(express.json());
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://ac-automation-one.vercel.app",
    "https://satguruengineers.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.set("trust proxy", 1);
app.options("*", cors(corsOptions)); // VERY IMPORTANT (preflight fix)
app.use('/api/uploads', express.static('uploads'));

// VERY IMPORTANT - Railway health check
app.get("/", (req, res) => {
  res.status(200).send("AC Automation Backend Running");
});

// Health endpoint for uptime check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ac-automation-api",
    time: new Date()
  });
});


import pool from './config/db.js';

async function ensureDatabaseReady() {
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
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        drawing_url VARCHAR(255),
        quotation_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_name (name)
      )
    `);

    await pool.execute(`
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
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
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

    try {
      await pool.execute('ALTER TABLE inventory ADD COLUMN type VARCHAR(50) AFTER brand');
      console.log('Added type column to inventory table');
    } catch (e: any) {
      if (!e.message.includes('Duplicate column name')) {
        console.error('Error adding type column:', e.message);
      }
    }

    try {
      await pool.execute('ALTER TABLE inventory ADD COLUMN sold_quantity INT DEFAULT 0 AFTER quantity');
      console.log('Added sold_quantity column to inventory table');
    } catch (e: any) {
      if (!e.message.includes('Duplicate column name')) {
        console.error('Error adding sold_quantity column:', e.message);
      }
    }

    await pool.execute(
      `INSERT IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
      ['hsd@icloud.com', '123', 'superadmin']
    );

    console.log("Database schema ready.");
  } catch (err) {
    console.error("Database initialization error:", err.message);
  }
}

ensureDatabaseReady();

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'coolbreeze_secret_key_123', (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user.role?.toLowerCase() === 'superadmin') return next();
  res.status(403).json({ error: 'Superadmin access required' });
};

const isAdminOrSuperAdmin = (req: any, res: any, next: any) => {
  const role = req.user.role?.toLowerCase();
  if (role === 'admin' || role === 'superadmin') return next();
  res.status(403).json({ error: 'Admin or Superadmin access required' });
};


// --- AUTH & USER ROUTES ---

app.post('/api/login', async (req, res) => {
  let { email, password } = req.body;
  email = email?.toLowerCase();
  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'No account found.' });

    const user = users[0];
    let validPass = false;
    try {
      validPass = await bcrypt.compare(password, user.password_hash);
    } catch (e) {
      validPass = false;
    }
    if (!validPass && password === user.password_hash) {
      validPass = true;
    }

    if (!validPass) return res.status(401).json({ error: 'Incorrect password.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'coolbreeze_secret_key_123',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: "Server connection error." });
  }
});

app.get('/api/users', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, email, role FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, isSuperAdmin, async (req, res) => {
  let { email, password, role } = req.body;

  // Normalize email and role to lowercase
  email = email?.toLowerCase();
  role = role?.toLowerCase();

  // Validate role
  const allowedRoles = ['admin', 'superadmin', 'technician'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role: ${role}. Allowed roles: ${allowedRoles.join(', ')}` });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hashedPassword, role]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMER ROUTES ---

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search;
    let query = 'SELECT id, name, email, phone, address, drawing_url AS drawingUrl, quotation_url AS quotationUrl, created_at AS createdAt FROM customers';
    let params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', authenticateToken, upload.fields([{ name: 'drawing' }, { name: 'quotation' }]), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const drawingUrl = req.files && req.files['drawing'] ? `/uploads/${req.files['drawing'][0].filename}` : null;
  const quotationUrl = req.files && req.files['quotation'] ? `/uploads/${req.files['quotation'][0].filename}` : null;

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO customers (name, email, phone, address, drawing_url, quotation_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, drawingUrl, quotationUrl]
    );
    res.json({ id: result.insertId, name, email, phone, address, drawingUrl, quotationUrl, createdAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', authenticateToken, upload.fields([{ name: 'drawing' }, { name: 'quotation' }]), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const newDrawingUrl = req.files && req.files['drawing'] ? `/uploads/${req.files['drawing'][0].filename}` : undefined;
  const newQuotationUrl = req.files && req.files['quotation'] ? `/uploads/${req.files['quotation'][0].filename}` : undefined;

  try {
    let query = 'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?';
    let params = [name, email, phone, address];

    if (newDrawingUrl !== undefined) {
      query += ', drawing_url = ?';
      params.push(newDrawingUrl);
    }
    if (newQuotationUrl !== undefined) {
      query += ', quotation_url = ?';
      params.push(newQuotationUrl);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.execute(query, params);

    // Fetch updated row to return
    const [rows] = await pool.execute('SELECT id, name, email, phone, address, drawing_url AS drawingUrl, quotation_url AS quotationUrl, created_at AS createdAt FROM customers WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- JOB ROUTES ---

app.get('/api/technicians', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT email FROM users WHERE role = "technician"');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    let activeQuery = 'SELECT COUNT(*) as count FROM jobs WHERE status = "Ongoing"';
    let completedQuery = 'SELECT COUNT(*) as count FROM jobs WHERE status = "Completed"';
    let params = [];

    if (req.user.role === 'technician') {
      activeQuery += ' AND LOWER(technician) = LOWER(?)';
      completedQuery += ' AND LOWER(technician) = LOWER(?)';
      params.push(req.user.email);

      const [[{ count: activeJobs }]]: any = await pool.execute(activeQuery, params);
      const [[{ count: completedJobs }]]: any = await pool.execute(completedQuery, params);
      return res.json({ activeJobs, completedJobs, health: '100%' });
    }

    const [[{ count: customers }]]: any = await pool.execute('SELECT COUNT(*) as count FROM customers');
    const [[{ count: activeJobs }]]: any = await pool.execute(activeQuery);
    const [[{ count: completedJobs }]]: any = await pool.execute(completedQuery);
    res.json({ customers, activeJobs, completedJobs, health: '100%' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs', authenticateToken, async (req, res) => {
  const { search } = req.query;
  try {
    let query = `
      SELECT 
        j.id, 
        j.customer_id AS customerId, 
        j.job_type AS jobType, 
        j.start_date AS startDate, 
        j.technician, 
        j.status, 
        j.payment_status AS paymentStatus,
        j.copper_piping_cost AS copperPipingCost,
        j.outdoor_fitting_cost AS outdoorFittingCost,
        j.commissioning_cost AS commissioningCost,
        j.total_cost AS totalCost,
        j.created_at AS createdAt,
        c.name as customerName,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE job_id = j.id) as totalPaid,
        (SELECT phase_name FROM job_phases WHERE job_id = j.id AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1) as currentPhase
      FROM jobs j 
      JOIN customers c ON j.customer_id = c.id
    `;

    const params = [];
    let whereClauses = [];

    if (req.user.role === 'technician') {
      whereClauses.push('LOWER(j.technician) = LOWER(?)');
      params.push(req.user.email);
    }

    if (search) {
      whereClauses.push('(c.name LIKE ? OR j.technician LIKE ? OR j.job_type LIKE ?)');
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY j.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', authenticateToken, async (req, res) => {
  const {
    customerId,
    jobType,
    technician,
    startDate,
    paymentStatus,
    copperPipingCost = 0,
    outdoorFittingCost = 0,
    commissioningCost = 0
  } = req.body;

  const totalCost = Number(copperPipingCost) + Number(outdoorFittingCost) + Number(commissioningCost);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result]: any = await connection.execute(
      'INSERT INTO jobs (customer_id, job_type, technician, start_date, payment_status, copper_piping_cost, outdoor_fitting_cost, commissioning_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customerId, jobType, technician, startDate, paymentStatus || 'Pending', copperPipingCost, outdoorFittingCost, commissioningCost, totalCost]
    );
    const jobId = result.insertId;

    const phasesToCreate = jobType === 'Service' ? SERVICE_PHASES : INSTALLATION_PHASES;

    for (let i = 0; i < phasesToCreate.length; i++) {
      await connection.execute(
        'INSERT INTO job_phases (job_id, phase_name, phase_order) VALUES (?, ?, ?)',
        [jobId, phasesToCreate[i], i + 1]
      );
    }
    await connection.commit();
    res.json({ id: jobId, success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/jobs/:id', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        j.id, 
        j.customer_id AS customerId, 
        j.job_type AS jobType, 
        j.start_date AS startDate, 
        j.technician, 
        j.status, 
        j.payment_status AS paymentStatus,
        j.copper_piping_cost AS copperPipingCost,
        j.outdoor_fitting_cost AS outdoorFittingCost,
        j.commissioning_cost AS commissioningCost,
        j.total_cost AS totalCost,
        j.created_at AS createdAt,
        c.name as customerName, 
        c.email as customerEmail, 
        c.phone as customerPhone, 
        c.address as customerAddress,
        (SELECT phase_name FROM job_phases WHERE job_id = j.id AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1) as currentPhase
      FROM jobs j 
      JOIN customers c ON j.customer_id = c.id 
      WHERE j.id = ?
    `;

    const params = [req.params.id];

    if (req.user.role === 'technician') {
      query += ' AND LOWER(j.technician) = LOWER(?)';
      params.push(req.user.email);
    }

    console.log('Fetching job details:', { id: req.params.id, user: req.user.email, role: req.user.role });

    // First check if job exists at all
    const [[exists]]: any = await pool.execute('SELECT id, technician FROM jobs WHERE id = ?', [req.params.id]);

    if (!exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Then check permissions
    if (req.user.role === 'technician') {
      const jobTech = exists.technician || '';
      if (jobTech.toLowerCase() !== req.user.email.toLowerCase()) {
        console.log('Access denied for technician:', { id: req.params.id, jobTech, user: req.user.email });
        return res.status(403).json({ error: 'Access denied. This job is assigned to another technician.' });
      }
    }

    const [[job]]: any = await pool.execute(query, params);

    if (!job) {
      return res.status(404).json({ error: 'Job details could not be retrieved' });
    }

    const [phases]: any = await pool.execute(`
      SELECT 
        id, 
        job_id AS jobId, 
        phase_name AS phaseName, 
        is_completed AS isCompleted, 
        completed_at AS completedAt, 
        phase_order AS \`order\`
      FROM job_phases 
      WHERE job_id = ? 
      ORDER BY phase_order ASC
    `, [req.params.id]);

    const mappedPhases = phases.map((p: any) => ({
      ...p,
      isCompleted: !!p.isCompleted
    }));

    res.json({ job, phases: mappedPhases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/jobs/:id/payment', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  try {
    await pool.execute('UPDATE jobs SET payment_status = ? WHERE id = ?', [paymentStatus, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/:id/payments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM payments WHERE job_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/payments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. Only admins can record payments.' });
  }

  const { id } = req.params;
  const { amount, paymentMethod, notes } = req.body;

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO payments (job_id, amount, payment_method, notes, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [id, amount, paymentMethod || 'Transfer', notes || '', req.user.email]
    );
    res.json({ id: result.insertId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/phases/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isCompleted } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ownership check for technicians
    if (req.user.role === 'technician') {
      const [[jobCheck]]: any = await connection.execute(`
        SELECT j.technician 
        FROM jobs j 
        JOIN job_phases jp ON j.id = jp.job_id 
        WHERE jp.id = ?
      `, [id]);

      if (!jobCheck || jobCheck.technician !== req.user.email) {
        await connection.rollback();
        return res.status(403).json({ error: 'Access denied. You can only update phases for your assigned jobs.' });
      }
    }

    const completedAt = isCompleted ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await connection.execute('UPDATE job_phases SET is_completed = ?, completed_at = ? WHERE id = ?', [isCompleted ? 1 : 0, completedAt, id]);

    const [[{ job_id }]]: any = await connection.execute('SELECT job_id FROM job_phases WHERE id = ?', [id]);
    const [[{ total }]]: any = await connection.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [job_id]);
    const [[{ completed }]]: any = await connection.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [job_id]);

    const isFinalPhase = (total === completed);
    const newStatus = isFinalPhase ? 'Completed' : 'Ongoing';
    await connection.execute('UPDATE jobs SET status = ? WHERE id = ?', [newStatus, job_id]);

    // Fetch the new current phase name
    const [[phaseInfo]]: any = await connection.execute('SELECT phase_name FROM job_phases WHERE job_id = ? AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1', [job_id]);
    const nextPhaseName = phaseInfo ? phaseInfo.phase_name : null;

    if (isCompleted) {
      const [[details]]: any = await connection.execute(`
        SELECT 
          c.email, 
          c.name as customerName, 
          j.id as jobId, 
          j.job_type as jobType, 
          j.technician, 
          j.payment_status as paymentStatus,
          j.copper_piping_cost as copperPipingCost,
          j.outdoor_fitting_cost as outdoorFittingCost,
          j.commissioning_cost as commissioningCost,
          jp.phase_name as phaseName
        FROM job_phases jp
        JOIN jobs j ON jp.job_id = j.id
        JOIN customers c ON j.customer_id = c.id
        WHERE jp.id = ?
      `, [id]);

      if (details) {
        sendPhaseNotification(
          details.email,
          details.customerName,
          details.jobType,
          details.phaseName,
          details.jobId,
          details.technician,
          details.paymentStatus,
          isFinalPhase,
          {
            copperPipingCost: details.copperPipingCost,
            outdoorFittingCost: details.outdoorFittingCost,
            commissioningCost: details.commissioningCost
          }
        );
      }
    }

    await connection.commit();
    res.json({ success: true, jobStatus: newStatus, currentPhase: nextPhaseName });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

const PORT = Number(process.env.PORT) || 5000;

// --- INVENTORY ROUTES ---

app.get('/api/inventory', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    console.log("GET /api/inventory - User role via middleware:", req.user?.role);
    const [rows] = await pool.execute('SELECT id, model_name as modelName, brand, type, tonnage, star_rating as starRating, quantity, sold_quantity as soldQuantity, our_price as ourPrice, sale_price as salePrice, created_at as createdAt, updated_at as updatedAt FROM inventory ORDER BY updated_at DESC');
    console.log("GET /api/inventory - returned rows count:", (rows as any).length);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/inventory ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const { modelName, brand, type, tonnage, starRating, quantity, soldQuantity, ourPrice, salePrice } = req.body;
  if (!modelName || !brand) {
    return res.status(400).json({ error: 'Model name and brand are required.' });
  }
  try {
    const [result]: any = await pool.execute(
      'INSERT INTO inventory (model_name, brand, type, tonnage, star_rating, quantity, sold_quantity, our_price, sale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [modelName, brand, type || null, tonnage || null, starRating || null, quantity || 0, soldQuantity || 0, ourPrice || 0, salePrice || 0]
    );
    res.json({ id: result.insertId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { modelName, brand, type, tonnage, starRating, quantity, soldQuantity, ourPrice, salePrice } = req.body;
  if (!modelName || !brand) {
    return res.status(400).json({ error: 'Model name and brand are required.' });
  }
  try {
    await pool.execute(
      'UPDATE inventory SET model_name = ?, brand = ?, type = ?, tonnage = ?, star_rating = ?, quantity = ?, sold_quantity = ?, our_price = ?, sale_price = ? WHERE id = ?',
      [modelName, brand, type || null, tonnage || null, starRating || null, quantity || 0, soldQuantity || 0, ourPrice || 0, salePrice || 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on ${PORT}`));

