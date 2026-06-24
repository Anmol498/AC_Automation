
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
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { sendEmail } from './utils/mailer.js';
import { addClient, broadcast } from './utils/sse.js';
import { validate } from './middleware/validate.js';
import { loginSchema, changePasswordSchema, createUserSchema } from './schemas/auth.js';
import { contactSchema } from './schemas/contact.js';
import { customerSchema } from './schemas/customer.js';
import { jobSchema, paymentStatusSchema, costsSchema, paymentSchema, updatePhaseSchema } from './schemas/job.js';
import { copperSchema, drainSchema, remoteSchema, othersSchema, acModelSchema, materialLogSchema, materialLogUpdateSchema } from './schemas/material.js';
import {
  inventoryItemSchema,
  copperInventorySchema,
  copperInventoryUpdateSchema,
  copperSizeSchema,
  copperGroupSchema
} from './schemas/inventory.js';
import { dailyWorkSchema, technicianWorkSchema } from './schemas/work.js';


declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required — refusing to start.');
}

const APP_VERSION = "2026-03-17_V2";
console.log(`>>> SERVER STARTING - VERSION: ${APP_VERSION} <<<`);

// Ensure directories exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
})

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.dwg', '.dxf'];

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Supported: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

const app = express();
app.use(cookieParser());

// SEC-02: Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://www.mitsubishielectric.in", "https://mitsubishielectric.in"],
      "script-src": isProd 
        ? ["'self'", "blob:"] 
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "blob:"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      "worker-src": ["'self'", "blob:"],
      "connect-src": ["'self'", "blob:", "data:", "https://cdn.jsdelivr.net"],
    },
  },
}));

// SEC-04: Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many inquiry messages sent. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

const sendPhaseNotification = async (
  fromEmail: string,
  customerEmail: string,
  customerName: string,
  jobType: string,
  phaseName: string,
  jobId: number,
  technician: string,
  paymentStatus: string,
  isFinal: boolean,
  costs: { copperPipingCost: number; outdoorFittingCost: number; commissioningCost: number }
) => {
  let paymentBlock = '';
  const isCopperPhase = phaseName.toLowerCase().includes('copper piping (payment)');
  const isOutdoorPhase = phaseName.toLowerCase().includes('outdoor fittings (payment)');
  const isCommissioningPhase = phaseName.toLowerCase().includes('commissioning (payment)');
  const isServiceFinalPhase = jobType === 'Service' && phaseName.toLowerCase().includes('final testing & payment');

  let amount: number | null = null;
  if (isCopperPhase || isOutdoorPhase || isCommissioningPhase || isServiceFinalPhase) {
    amount = isCopperPhase ? costs.copperPipingCost :
             isOutdoorPhase ? costs.outdoorFittingCost :
             costs.commissioningCost;
  }

  if (amount !== null && amount > 0) {
    paymentBlock = `
      <div style="margin-top: 20px; padding: 20px; background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; text-align: center;">
        <h2 style="color: #9a3412; font-size: 16px; margin-bottom: 10px;">Payment Request: ${phaseName}</h2>
        <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c2410c;">
            Amount Due: ₹${Number(amount).toLocaleString()}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
            Current Payment Status: <strong>${paymentStatus}</strong>
          </p>
        </div>
      </div>
    `;
  }

  if (isFinal) {
    paymentBlock += `
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
    from: `"Satguru Engineers" <${fromEmail}>`,
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
          
          ${paymentBlock || ''}

          <p style="margin-top: 32px;">Our team is dedicated to providing high-quality service. If you have any questions, feel free to reply to this email.</p>
          <p style="margin-top: 20px; font-size: 14px; font-weight: 500; color: #1e293b;">Please let us know if anything is pending regarding the same</p>
          <p style="margin-top: 16px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} Satguru Engineers.
        </div>
      </div>
    `
  };

  return await sendEmail(fromEmail, customerEmail, mailOptions.subject, "", mailOptions.html);
};

app.use(express.json());

const authenticateToken = (req: any, res: any, next: any) => {
  let token = req.cookies?.access_token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
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

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://ac-automation-one.vercel.app",
    "https://satguruengineers.vercel.app",
    "https://satguruengineers.com",
    "https://www.satguruengineers.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length"]
};

app.use(cors(corsOptions));
app.set("trust proxy", 1);
app.options("*", cors(corsOptions)); // VERY IMPORTANT (preflight fix)

// SEC-03: Centralized Error response handling to prevent raw database leaks in production
app.use((req: any, res: any, next: any) => {
  const originalJson = res.json;
  res.json = function (body: any) {
    if (res.statusCode === 500 && body) {
      console.error("Internal Server Error caught in interceptor:", body.error || body);
      if (process.env.NODE_ENV !== 'development') {
        body = { error: 'Internal server error' };
      }
    }
    return originalJson.call(this, body);
  };
  next();
});

// SSE Broadcast interceptor middleware for successful mutation requests
app.use((req: any, res: any, next: any) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method;
      const path = req.path;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (path.startsWith('/api/customers')) {
          broadcast('customers');
        } else if (path.startsWith('/api/jobs') || path.startsWith('/api/phases') || path.startsWith('/api/payments')) {
          broadcast('jobs');
        } else if (path.startsWith('/api/inventory')) {
          broadcast('inventory');
        } else if (path.startsWith('/api/daily-work') || path.startsWith('/api/technician-work')) {
          broadcast('work');
        } else if (path.startsWith('/api/material-logs') || path.startsWith('/api/material')) {
          broadcast('jobs');
          broadcast('inventory');
        } else if (path.startsWith('/api/users')) {
          broadcast('users');
        } else if (path.startsWith('/api/settings')) {
          broadcast('settings');
          if (path.includes('cleanup-audit-logs')) {
            broadcast('inventory');
          }
        }
      }
    }
  });
  next();
});

const resolvedUploadDir = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);
app.use('/api/uploads', authenticateToken, (req, res, next) => {
  // Expose Content-Length for cross-origin download progress tracking
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
  if (!req.path.match(/\.(jpg|jpeg|png|webp|dwg|dxf|pdf|xlsx|xls)$/i)) {
    res.setHeader('Content-Disposition', 'attachment');
  }
  next();
}, express.static(resolvedUploadDir));
// Catch 404 for missing files in /api/uploads to avoid redirection to SPA
app.use('/api/uploads', (req, res) => {
  res.status(404).json({ error: 'File not found' });
});

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


function escapeHtml(text: string): string {
  return text
    ? text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    : '';
}

const sanitizeHeader = (text: string): string => {
  return text ? text.replace(/[\r\n]/g, '').trim() : '';
};

// --- PUBLIC CONTACT FORM ENDPOINT ---
app.post("/api/contact", contactLimiter, validate(contactSchema), async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const safeName = sanitizeHeader(name);
  const safeEmail = sanitizeHeader(email);
  const safePhone = phone ? sanitizeHeader(phone) : '';
  const safeSubject = subject ? sanitizeHeader(subject) : '';

  const escapedName = escapeHtml(safeName);
  const escapedEmail = escapeHtml(safeEmail);
  const escapedPhone = escapeHtml(safePhone);
  const escapedSubject = escapeHtml(safeSubject);
  const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>');

  // Fetch mail transport preference to choose correct fromEmail
  let mailTransport = 'smtp';
  try {
    const [rows]: any = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = "mail_transport"');
    if (rows.length > 0) mailTransport = rows[0].setting_value;
  } catch (err) {
    console.error("Error fetching mail setting:", err);
  }

  try {
    const subjectLine = escapedSubject
      ? `New Contact Inquiry: ${escapedSubject}`
      : `New Contact Inquiry from ${escapedName}`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">New Enquiry</h1>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #64748b; width: 120px; vertical-align: top;">Name</td>
              <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${escapedName}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 8px 12px; font-weight: bold; color: #64748b; vertical-align: top;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${escapedEmail}" style="color: #2563eb; text-decoration: none;">${escapedEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #64748b; vertical-align: top;">Phone</td>
              <td style="padding: 8px 12px; color: #1e293b;">${escapedPhone || 'Not provided'}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 8px 12px; font-weight: bold; color: #64748b; vertical-align: top;">Subject</td>
              <td style="padding: 8px 12px; color: #1e293b;">${escapedSubject || 'General Inquiry'}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #2563eb; font-size: 13px;">MESSAGE</p>
            <p style="margin: 0; color: #334155; white-space: pre-wrap;">${escapedMessage}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
            This message was sent via the Contact Us form on the Satguru Engineers website.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} Satguru Engineers.
        </div>
      </div>
    `;

    // Send the email to the business owner
    const businessEmail = process.env.EMAIL_USER || 'contact@satguruengineers.com';
    const fromEmail = mailTransport === 'google_oauth' 
      ? (process.env.GMAIL_USER || 'contactsatguruengineers@gmail.com')
      : (process.env.EMAIL_USER || 'contact@satguruengineers.com');
      
    const mailResult = await sendEmail(fromEmail, businessEmail, subjectLine, "", htmlBody);
    
    if (!mailResult.success) {
      console.error("Contact Us Email Failed:", mailResult.error);
      return res.status(500).json({ 
        error: "Failed to deliver your message.",
        details: mailResult.error,
        suggestion: "Please try calling us or emailing directly."
      });
    }

    res.json({ success: true, message: "Your message has been sent successfully. We'll get back to you soon!" });
  } catch (error: any) {
    console.error("Contact form error:", error.message || error);
    res.status(500).json({ error: "Failed to send your message. Please try again later." });
  }
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
    try {
      await pool.execute("ALTER TABLE inventory_copper ADD COLUMN group_name VARCHAR(50) NOT NULL DEFAULT 'Standard Sizes'");
      console.log('Successfully added group_name column to inventory_copper');
    } catch (err) {
      // Column might already exist, which is fine
    }

    // Alter table to add email_status column to job_phases if it doesn't exist
    try {
      await pool.execute("ALTER TABLE job_phases ADD COLUMN email_status VARCHAR(50) DEFAULT NULL");
      console.log('Successfully added email_status column to job_phases');
    } catch (err) {
      // Column might already exist, which is fine
    }

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

    try {
      await pool.execute("ALTER TABLE material_logs MODIFY COLUMN category ENUM('copper', 'drain', 'remote', 'other', 'ac_model') NOT NULL");
      console.log("Successfully altered material_logs table to include 'ac_model' ENUM value.");
    } catch (err: any) {
      console.log("Altering material_logs enum category column was skipped or failed:", err.message);
    }

    try {
      await pool.execute("ALTER TABLE inventory_history ADD COLUMN job_id INT DEFAULT NULL");
      await pool.execute("ALTER TABLE inventory_history ADD CONSTRAINT fk_inv_history_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL");
      console.log("Successfully altered inventory_history table to include job_id column and constraint.");
    } catch (err: any) {
      console.log("Altering inventory_history to include job_id was skipped or failed:", err.message);
    }

    try {
      await pool.execute("ALTER TABLE inventory_history MODIFY COLUMN action_type ENUM('ADDED_STOCK', 'SOLD_STOCK', 'UPDATED_DETAILS', 'RETURNED_STOCK') NOT NULL");
      console.log("Successfully altered inventory_history table to include 'RETURNED_STOCK' in action_type ENUM.");
    } catch (err: any) {
      console.log("Altering inventory_history action_type ENUM was skipped or failed:", err.message);
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        value_type ENUM('string', 'integer', 'boolean', 'json') NOT NULL DEFAULT 'string',
        setting_value TEXT NOT NULL
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

    console.log("Database schema ready.");
  } catch (err: any) {
    console.error("Database initialization error:", err.message);
  }
}

ensureDatabaseReady();


// --- AUTH & USER ROUTES ---

app.post('/api/login', authLimiter, validate(loginSchema), async (req, res) => {
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

    if (!validPass) return res.status(401).json({ error: 'Incorrect password.' });

    // Generate access token (expires in 15 minutes)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate refresh token (random 40 bytes)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshTokenHash, expiresAt]
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      token, // Keep token in body for backward compatibility
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err: any) {
    console.error("Login Error:", err.message || err);
    res.status(500).json({ 
      error: "Server connection error.",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token: refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [tokens]: any = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()',
      [refreshTokenHash]
    );

    if (tokens.length === 0) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenRecord = tokens[0];
    const [users]: any = await pool.execute('SELECT * FROM users WHERE id = ?', [tokenRecord.user_id]);
    if (users.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = users[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Swap refresh tokens
    await pool.execute('DELETE FROM refresh_tokens WHERE token_hash = ?', [refreshTokenHash]);
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, newRefreshTokenHash, expiresAt]
    );

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token: newAccessToken,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err: any) {
    console.error('Refresh Token Error:', err.message || err);
    res.status(500).json({ error: 'Internal server error during token refresh' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const { refresh_token: refreshToken } = req.cookies;
  if (refreshToken) {
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    try {
      await pool.execute('DELETE FROM refresh_tokens WHERE token_hash = ?', [refreshTokenHash]);
    } catch (err) {
      console.error('Logout DB Error:', err);
    }
  }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/status', authenticateToken, (req, res) => {
  res.json({
    isAuthenticated: true,
    user: { id: req.user.id, email: req.user.email, role: req.user.role }
  });
});

// Realtime updates SSE stream registration route
app.get('/api/realtime', (req, res) => {
  const token = req.cookies?.access_token;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    
    const clientId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const cleanup = addClient(clientId, res, user.id);
    
    req.on('close', () => {
      cleanup();
    });
  });
});

app.put('/api/auth/change-password', authenticateToken, validate(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    let validPass = false;
    try {
      validPass = await bcrypt.compare(currentPassword, user.password_hash);
    } catch (e) {
      validPass = false;
    }

    if (!validPass) return res.status(401).json({ error: 'Incorrect current password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error' });
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

app.post('/api/users', authenticateToken, isSuperAdmin, validate(createUserSchema), async (req, res) => {
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

function parseSetting(row: any) {
  switch (row.value_type) {
    case 'integer': return parseInt(row.setting_value, 10);
    case 'boolean': return row.setting_value === 'true' || row.setting_value === '1';
    case 'json':
      try { return JSON.parse(row.setting_value); } catch(e) { return row.setting_value; }
    default:        return row.setting_value;
  }
}

// --- SETTINGS ROUTES ---

app.get('/api/settings', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const [rows]: any = await pool.execute('SELECT setting_key, value_type, setting_value FROM settings');
    const settings: Record<string, any> = {};
    rows.forEach((row: any) => {
      settings[row.setting_key] = parseSetting(row);
    });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authenticateToken, isSuperAdmin, async (req, res) => {
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      let valueType = 'string';
      let valueStr = '';
      if (typeof value === 'boolean') {
        valueType = 'boolean';
        valueStr = value ? 'true' : 'false';
      } else if (typeof value === 'number') {
        valueType = 'integer';
        valueStr = value.toString();
      } else if (typeof value === 'object') {
        valueType = 'json';
        valueStr = JSON.stringify(value);
      } else {
        valueType = 'string';
        valueStr = String(value);
      }
      await pool.execute(
        'INSERT INTO settings (setting_key, value_type, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_type = ?, setting_value = ?',
        [key, valueType, valueStr, valueType, valueStr]
      );
    }
    res.json({ success: true, message: "Settings updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/cleanup-audit-logs', authenticateToken, isSuperAdmin, async (req, res) => {
  const days = parseInt(req.query.days as string, 10);
  if (isNaN(days) || days < 1) {
    return res.status(400).json({ error: "Invalid days parameter. Must be a positive integer." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete inventory history logs older than X days
    const [invResult]: any = await connection.execute(
      'DELETE FROM inventory_history WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );

    // Delete copper warehouse logs older than X days
    const [copperResult]: any = await connection.execute(
      'DELETE FROM copper_warehouse_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Successfully cleared logs older than ${days} days.`,
      deletedInventoryHistory: invResult.affectedRows || 0,
      deletedCopperLogs: copperResult.affectedRows || 0
    });
  } catch (err: any) {
    await connection.rollback();
    console.error("Audit log cleanup error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const [rows]: any = await pool.execute('SELECT setting_key, value_type, setting_value FROM settings WHERE setting_key IN ("company_phone", "company_email")');
    const config: Record<string, any> = {
      company_phone: '95922 92292',
      company_email: 'contactsatguruengineer@gmail.com'
    };
    rows.forEach((row: any) => {
      config[row.setting_key] = parseSetting(row);
    });
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMER ROUTES ---

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search;
    let query = 'SELECT id, name, email, phone, address, drawing_url AS drawingUrl, quotation_url AS quotationUrl, created_at AS createdAt FROM customers WHERE deleted_at IS NULL';
    let params = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR address LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', authenticateToken, upload.fields([{ name: 'drawing' }, { name: 'quotation' }]), validate(customerSchema), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const drawingUrl = req.files && req.files['drawing'] ? `/uploads/${req.files['drawing'][0].filename}` : null;
  const quotationUrl = req.files && req.files['quotation'] ? `/uploads/${req.files['quotation'][0].filename}` : null;

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO customers (name, email, phone, address, drawing_url, quotation_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email || null, phone || null, address || null, drawingUrl, quotationUrl]
    );
    res.json({ id: result.insertId, name, email: email || null, phone: phone || null, address: address || null, drawingUrl, quotationUrl, createdAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', authenticateToken, upload.fields([{ name: 'drawing' }, { name: 'quotation' }]), validate(customerSchema), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const newDrawingUrl = req.files && req.files['drawing'] ? `/uploads/${req.files['drawing'][0].filename}` : undefined;
  const newQuotationUrl = req.files && req.files['quotation'] ? `/uploads/${req.files['quotation'][0].filename}` : undefined;

  try {
    let query = 'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?';
    let params: any[] = [name, email || null, phone || null, address || null];

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
    const [rows] = await pool.execute('SELECT id, name, email, phone, address, drawing_url AS drawingUrl, quotation_url AS quotationUrl, created_at AS createdAt FROM customers WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
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
    const [[{ count: customers }]]: any = await pool.execute('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL');
    let activeQuery = 'SELECT COUNT(*) as count FROM jobs WHERE status = "Ongoing" AND deleted_at IS NULL';
    let completedQuery = 'SELECT COUNT(*) as count FROM jobs WHERE status = "Completed" AND deleted_at IS NULL';
    let params = [];

    if (req.user.role === 'technician') {
      activeQuery += ' AND technician_id = ?';
      completedQuery += ' AND technician_id = ?';
      params.push(req.user.id);

      const [[{ count: activeJobs }]]: any = await pool.execute(activeQuery, params);
      const [[{ count: completedJobs }]]: any = await pool.execute(completedQuery, params);
      return res.json({ activeJobs, completedJobs, health: '100%' });
    }

    const [[{ count: activeJobs }]]: any = await pool.execute(activeQuery);
    const [[{ count: completedJobs }]]: any = await pool.execute(completedQuery);
    
    // Fetch user counts grouped by role
    const [userRows]: any = await pool.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const userCounts = { admin: 0, superadmin: 0, technician: 0 };
    userRows.forEach((row: any) => {
      if (row.role in userCounts) {
        userCounts[row.role as keyof typeof userCounts] = Number(row.count);
      }
    });

    // Fetch monthly collected revenue (payments received per month over last 6 months)
    const [paymentsCollected]: any = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month, 
        SUM(amount) as collected
      FROM payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    // Fetch monthly estimated revenue split (jobs created/started per month over last 6 months)
    const [jobsRevenue]: any = await pool.execute(`
      SELECT 
        DATE_FORMAT(j.start_date, '%Y-%m') as month,
        SUM(j.total_cost) as estimated,
        SUM(COALESCE(jcs.total_received, 0)) as received,
        SUM(COALESCE(jcs.balance_due, 0)) as outstanding
      FROM jobs j
      LEFT JOIN job_cost_summary jcs ON jcs.job_id = j.id
      WHERE j.start_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND j.deleted_at IS NULL
      GROUP BY month
      ORDER BY month ASC
    `);

    // Generate last 6 months list (from 5 months ago to current month)
    const revenueStats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // avoid month overflow issues (e.g. if today is 31st)
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7); // "YYYY-MM"
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // "Jun 26"
      revenueStats.push({ month: monthStr, label, collected: 0, estimated: 0, received: 0, outstanding: 0 });
    }

    // Merge payments data
    paymentsCollected.forEach((row: any) => {
      const match = revenueStats.find(m => m.month === row.month);
      if (match) {
        match.collected = Number(row.collected || 0);
      }
    });

    // Merge jobs revenue data
    jobsRevenue.forEach((row: any) => {
      const match = revenueStats.find(m => m.month === row.month);
      if (match) {
        match.estimated = Number(row.estimated || 0);
        match.received = Number(row.received || 0);
        match.outstanding = Number(row.outstanding || 0);
      }
    });

    res.json({ customers, activeJobs, completedJobs, userCounts, revenueStats, health: '100%' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs', authenticateToken, async (req, res) => {
  const { search, customerId } = req.query;
  try {
    let query = `
      SELECT 
        j.id, 
        j.customer_id AS customerId, 
        j.job_type AS jobType, 
        j.start_date AS startDate, 
        u.email AS technician, 
        j.status, 
        j.payment_status AS paymentStatus,
        j.total_cost AS totalCost,
        j.created_at AS createdAt,
        c.name as customerName,
        c.address as customerAddress,
        jcs.total_received AS totalPaid,
        jcs.total_received AS totalReceived,
        jcs.balance_due AS balanceDue,
        jcs.net_copper_feet_used AS netCopperFeetUsed,
        (SELECT phase_name FROM job_phases WHERE job_id = j.id AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1) as currentPhase
      FROM jobs j 
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.technician_id = u.id
      LEFT JOIN job_cost_summary jcs ON jcs.job_id = j.id
      WHERE j.deleted_at IS NULL AND c.deleted_at IS NULL
    `;

    const params = [];
    let whereClauses = [];

    if (req.user.role === 'technician') {
      whereClauses.push('j.technician_id = ?');
      params.push(req.user.id);
    }

    if (customerId) {
      whereClauses.push('j.customer_id = ?');
      params.push(customerId);
    }

    if (search) {
      whereClauses.push('(c.name LIKE ? OR u.email LIKE ? OR j.job_type LIKE ? OR c.address LIKE ?)');
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal, searchVal);
    }

    if (whereClauses.length > 0) {
      query += ` AND ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY j.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', authenticateToken, validate(jobSchema), async (req, res) => {
  const {
    customerId,
    jobType,
    technician,
    startDate,
    paymentStatus,
    copperPipingCost = 0,
    outdoorFittingCost = 0,
    commissioningCost = 0,
    equipmentCost = 0
  } = req.body;

  const totalCost = Number(copperPipingCost) + Number(outdoorFittingCost) + Number(commissioningCost);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[userRow]]: any = await connection.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [technician]);
    const technicianId = userRow ? userRow.id : null;

    const [result]: any = await connection.execute(
      'INSERT INTO jobs (customer_id, job_type, technician_id, start_date, payment_status, copper_piping_cost, outdoor_fitting_cost, commissioning_cost, equipment_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [customerId, jobType, technicianId, startDate, paymentStatus || 'Pending', copperPipingCost, outdoorFittingCost, commissioningCost, equipmentCost, totalCost]
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
  } catch (err: any) {
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
        u.email AS technician, 
        j.status, 
        j.payment_status AS paymentStatus,
        j.copper_piping_cost AS copperPipingCost,
        j.outdoor_fitting_cost AS outdoorFittingCost,
        j.commissioning_cost AS commissioningCost,
        j.equipment_cost AS equipmentCost,
        j.total_cost AS totalCost,
        j.created_at AS createdAt,
        c.name as customerName, 
        c.email as customerEmail, 
        c.phone as customerPhone, 
        c.address as customerAddress,
        c.drawing_url as drawingUrl,
        c.quotation_url as quotationUrl,
        jcs.total_received AS totalReceived,
        jcs.balance_due AS balanceDue,
        jcs.net_copper_feet_used AS netCopperFeetUsed,
        (SELECT phase_name FROM job_phases WHERE job_id = j.id AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1) as currentPhase
      FROM jobs j 
      JOIN customers c ON j.customer_id = c.id 
      LEFT JOIN users u ON j.technician_id = u.id
      LEFT JOIN job_cost_summary jcs ON jcs.job_id = j.id
      WHERE j.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
    `;

    const params = [req.params.id];

    if (req.user.role === 'technician') {
      query += ' AND j.technician_id = ?';
      params.push(req.user.id);
    }

    console.log('Fetching job details:', { id: req.params.id, user: req.user.email, role: req.user.role });

    // First check if job exists at all and is not deleted
    const [[exists]]: any = await pool.execute('SELECT id, technician_id FROM jobs WHERE id = ? AND deleted_at IS NULL', [req.params.id]);

    if (!exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Then check permissions
    if (req.user.role === 'technician') {
      if (exists.technician_id !== req.user.id) {
        console.log('Access denied for technician:', { id: req.params.id, jobTechId: exists.technician_id, user: req.user.email });
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
        phase_order AS \`order\`,
        email_status AS emailStatus
      FROM job_phases 
      WHERE job_id = ? 
      ORDER BY phase_order ASC
    `, [req.params.id]);

    const mappedPhases = phases.map((p: any) => ({
      ...p,
      isCompleted: !!p.isCompleted
    }));

    res.json({ job, phases: mappedPhases });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/jobs/:id/payment', authenticateToken, isAdminOrSuperAdmin, validate(paymentStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  try {
    await pool.execute('UPDATE jobs SET payment_status = ? WHERE id = ?', [paymentStatus, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/jobs/:id/costs', authenticateToken, isAdminOrSuperAdmin, validate(costsSchema), async (req, res) => {
  const { id } = req.params;
  const { copperPipingCost, outdoorFittingCost, commissioningCost, equipmentCost } = req.body;
  
  const totalCost = Number(copperPipingCost || 0) + Number(outdoorFittingCost || 0) + Number(commissioningCost || 0);

  try {
    await pool.execute(
      'UPDATE jobs SET copper_piping_cost = ?, outdoor_fitting_cost = ?, commissioning_cost = ?, equipment_cost = ?, total_cost = ? WHERE id = ?',
      [copperPipingCost || 0, outdoorFittingCost || 0, commissioningCost || 0, equipmentCost || 0, totalCost, id]
    );
    res.json({ 
      success: true, 
      totalCost,
      copperPipingCost,
      outdoorFittingCost,
      commissioningCost,
      equipmentCost
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/:id/payments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.id, p.job_id AS jobId, p.amount, p.category, p.payment_method AS paymentMethod, p.notes, u.email AS recorded_by, p.recorded_by_id AS recordedById, p.created_at AS createdAt
      FROM payments p
      LEFT JOIN users u ON p.recorded_by_id = u.id
      WHERE p.job_id = ? 
      ORDER BY p.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/payments', authenticateToken, isAdminOrSuperAdmin, validate(paymentSchema), async (req, res) => {

  const { id } = req.params;
  const { amount, category, paymentMethod, notes } = req.body;

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO payments (job_id, amount, category, payment_method, notes, recorded_by_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, amount, category || 'Low-Side', paymentMethod || 'Transfer', notes || '', req.user.id]
    );
    res.json({ id: result.insertId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM payments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('UPDATE jobs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EMAIL PREVIEW FOR PHASE COMPLETION ---
app.get('/api/phases/:id/email-preview', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [[details]]: any = await pool.execute(`
      SELECT 
        c.email, 
        c.name as customerName, 
        j.id as jobId, 
        j.job_type as jobType, 
        u.email as technician, 
        j.payment_status as paymentStatus,
        j.copper_piping_cost as copperPipingCost,
        j.outdoor_fitting_cost as outdoorFittingCost,
        j.commissioning_cost as commissioningCost,
        jp.phase_name as phaseName
      FROM job_phases jp
      JOIN jobs j ON jp.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.technician_id = u.id
      WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
    `, [id]);

    if (!details) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Count phases to determine if this would be the final phase
    const [[{ job_id }]]: any = await pool.execute('SELECT job_id FROM job_phases WHERE id = ?', [id]);
    const [[{ total }]]: any = await pool.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [job_id]);
    const [[{ completed }]]: any = await pool.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [job_id]);
    const wouldBeFinal = (total === completed + 1);

    // Determine payment amount if this is a payment phase
    const phaseLower = details.phaseName.toLowerCase();
    const isCopperPhase = phaseLower.includes('copper piping (payment)');
    const isOutdoorPhase = phaseLower.includes('outdoor fittings (payment)');
    const isCommissioningPhase = phaseLower.includes('commissioning (payment)');
    const isServiceFinalPhase = details.jobType === 'Service' && phaseLower.includes('final testing & payment');
    const isPaymentPhase = isCopperPhase || isOutdoorPhase || isCommissioningPhase || isServiceFinalPhase;

    let paymentAmount = 0;
    if (isCopperPhase) paymentAmount = Number(details.copperPipingCost);
    else if (isOutdoorPhase) paymentAmount = Number(details.outdoorFittingCost);
    else if (isCommissioningPhase || isServiceFinalPhase) paymentAmount = Number(details.commissioningCost);

    const subject = wouldBeFinal
      ? `Final Project Completion: ${details.phaseName}`
      : `Update: ${details.phaseName} Completed`;

    const defaultMessage = wouldBeFinal
      ? `We're pleased to inform you that your ${details.jobType} project (Job #${details.jobId}) has been fully completed. All phases have been successfully finished. Thank you for choosing Satguru Engineers!\n\nPlease let us know if anything is pending regarding the same`
      : `We're writing to let you know that a key milestone in your ${details.jobType} has been successfully completed: "${details.phaseName}". Our team is dedicated to providing high-quality service.\n\nPlease let us know if anything is pending regarding the same`;

    res.json({
      to: details.email,
      customerName: details.customerName,
      subject,
      message: defaultMessage,
      phaseName: details.phaseName,
      jobId: details.jobId,
      jobType: details.jobType,
      technician: details.technician,
      isFinal: wouldBeFinal,
      isPaymentPhase,
      paymentAmount,
      paymentStatus: details.paymentStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/phases/:id', authenticateToken, validate(updatePhaseSchema), async (req, res) => {
  const { id } = req.params;
  const { isCompleted, customSubject, customGreeting, customMessage, customPaymentAmount, skipEmail } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ownership check for technicians
    if (req.user.role === 'technician') {
      const [[jobCheck]]: any = await connection.execute(`
        SELECT j.technician_id 
        FROM jobs j 
        JOIN job_phases jp ON j.id = jp.job_id 
        WHERE jp.id = ? AND j.deleted_at IS NULL
      `, [id]);

      if (!jobCheck || jobCheck.technician_id !== req.user.id) {
        await connection.rollback();
        return res.status(403).json({ error: 'Access denied. You can only update phases for your assigned jobs.' });
      }
    }

    const completedAt = isCompleted ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await connection.execute('UPDATE job_phases SET is_completed = ?, completed_at = ? WHERE id = ?', [isCompleted ? 1 : 0, completedAt, id]);

    if (!isCompleted) {
      await connection.execute('UPDATE job_phases SET email_status = NULL WHERE id = ?', [id]);
    } else if (skipEmail) {
      await connection.execute('UPDATE job_phases SET email_status = "skipped" WHERE id = ?', [id]);
    }

    const [[{ job_id }]]: any = await connection.execute('SELECT job_id FROM job_phases WHERE id = ?', [id]);
    const [[{ total }]]: any = await connection.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [job_id]);
    const [[{ completed }]]: any = await connection.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [job_id]);

    const isFinalPhase = (total === completed);
    const newStatus = isFinalPhase ? 'Completed' : 'Ongoing';
    await connection.execute('UPDATE jobs SET status = ? WHERE id = ?', [newStatus, job_id]);

    // Fetch the new current phase name
    const [[phaseInfo]]: any = await connection.execute('SELECT phase_name FROM job_phases WHERE job_id = ? AND is_completed = 0 ORDER BY phase_order ASC LIMIT 1', [job_id]);
    const nextPhaseName = phaseInfo ? phaseInfo.phase_name : null;

    if (isCompleted && !skipEmail) {
      const [[details]]: any = await connection.execute(`
        SELECT 
          c.email, 
          c.name as customerName, 
          j.id as jobId, 
          j.job_type as jobType, 
          u.email as technician, 
          j.payment_status as paymentStatus,
          j.copper_piping_cost as copperPipingCost,
          j.outdoor_fitting_cost as outdoorFittingCost,
          j.commissioning_cost as commissioningCost,
          jp.phase_name as phaseName
        FROM job_phases jp
        JOIN jobs j ON jp.job_id = j.id
        JOIN customers c ON j.customer_id = c.id
        LEFT JOIN users u ON j.technician_id = u.id
        WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
      `, [id]);

      if (details) {
        let emailResult: { success: boolean; error?: string } = { success: false };

        // Fetch mail transport preference
        let mailTransport = 'smtp';
        try {
          const [rows]: any = await connection.execute('SELECT setting_value FROM settings WHERE setting_key = "mail_transport"');
          if (rows.length > 0) mailTransport = rows[0].setting_value;
        } catch (err) {
          console.error("Error fetching mail setting:", err);
        }

        const fromEmail = mailTransport === 'google_oauth' 
          ? (process.env.GMAIL_USER || 'contactsatguruengineers@gmail.com')
          : (process.env.EMAIL_USER || 'contact@satguruengineers.com');

        if (customSubject || customMessage) {
          // Send custom email with user's edited content
          const subject = escapeHtml(customSubject || `Update: ${details.phaseName} Completed`);
          const greeting = escapeHtml(customGreeting || `Hello ${details.customerName},`);
          const message = escapeHtml(customMessage || '');
          
          // Build payment block if it's a payment phase or custom amount provided
          let paymentBlock = '';
          const isCopperPhase = details.phaseName.toLowerCase().includes('copper piping (payment)');
          const isOutdoorPhase = details.phaseName.toLowerCase().includes('outdoor fittings (payment)');
          const isCommissioningPhase = details.phaseName.toLowerCase().includes('commissioning (payment)');
          const isServiceFinalPhase = details.jobType === 'Service' && details.phaseName.toLowerCase().includes('final testing & payment');

          let amount: number | null = null;
          if (customPaymentAmount && Number(customPaymentAmount) > 0) {
            amount = Number(customPaymentAmount);
          } else if (isCopperPhase || isOutdoorPhase || isCommissioningPhase || isServiceFinalPhase) {
            amount = isCopperPhase ? details.copperPipingCost :
                     isOutdoorPhase ? details.outdoorFittingCost :
                     details.commissioningCost;
          }

          if (amount !== null && amount > 0) {
            paymentBlock = `
              <div style="margin-top: 20px; padding: 20px; background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; text-align: center;">
                <h2 style="color: #9a3412; font-size: 16px; margin-bottom: 10px;">Payment Request: ${details.phaseName}</h2>
                <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c2410c;">
                    Amount Due: ₹${Number(amount).toLocaleString()}
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
                    Current Payment Status: <strong>${details.paymentStatus}</strong>
                  </p>
                </div>
              </div>
            `;
          }

          // Build completion block if final phase
          let completionBlock = '';
          if (isFinalPhase) {
            completionBlock = `
              <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border: 2px dashed #2563eb; border-radius: 12px; text-align: center;">
                <h2 style="color: #1e3a8a; font-size: 18px; margin-bottom: 10px;">Project Successfully Completed!</h2>
                <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">Your system is now fully operational.</p>
                <div style="background-color: ${details.paymentStatus === 'Fully Received' ? '#ecfdf5' : '#fff7ed'}; border: 1px solid ${details.paymentStatus === 'Fully Received' ? '#10b981' : '#f97316'}; padding: 15px; border-radius: 8px;">
                  <p style="margin: 0; font-weight: bold; color: ${details.paymentStatus === 'Fully Received' ? '#065f46' : '#9a3412'};">
                    Payment Status: ${details.paymentStatus.toUpperCase()}
                  </p>
                </div>
              </div>
            `;
          }

          const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 20px;">Satguru Engineers Service Update</h1>
              </div>
              <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
                <p>${greeting}</p>
                <p style="white-space: pre-wrap;">${message}</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #2563eb;">Phase: ${details.phaseName}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Job ID: #${details.jobId} | Technician: ${details.technician}</p>
                </div>
                ${paymentBlock}
                ${completionBlock}
                <p style="margin-top: 16px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Satguru Engineers.
              </div>
            </div>
          `;
          
          emailResult = await sendEmail(fromEmail, details.email, subject, "", htmlBody);
        } else {
          // Send default template email
          emailResult = await sendPhaseNotification(
            fromEmail,
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

        const emailStatus = emailResult.success ? 'sent' : 'failed';
        await connection.execute('UPDATE job_phases SET email_status = ? WHERE id = ?', [emailStatus, id]);

        await connection.commit();
        return res.json({ 
          success: true, 
          jobStatus: newStatus, 
          currentPhase: nextPhaseName, 
          emailSent: emailResult.success,
          emailError: emailResult.error 
        });
      }
    }

    await connection.commit();
    res.json({ success: true, jobStatus: newStatus, currentPhase: nextPhaseName, emailSent: false });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// --- RESEND EMAIL FOR A COMPLETED PHASE ---
app.post('/api/phases/:id/resend-email', authenticateToken, validate(updatePhaseSchema), async (req, res) => {
  const { id } = req.params;
  const { customSubject, customGreeting, customMessage, customPaymentAmount } = req.body;

  try {
    const [[details]]: any = await pool.execute(`
      SELECT 
        c.email, 
        c.name as customerName, 
        j.id as jobId, 
        j.job_type as jobType, 
        u.email as technician, 
        j.payment_status as paymentStatus,
        jp.phase_name as phaseName,
        jp.is_completed as isCompleted
      FROM job_phases jp
      JOIN jobs j ON jp.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.technician_id = u.id
      WHERE jp.id = ? AND j.deleted_at IS NULL AND c.deleted_at IS NULL
    `, [id]);

    if (!details) return res.status(404).json({ error: 'Phase not found' });
    if (!details.isCompleted) return res.status(400).json({ error: 'Phase is not yet completed' });

    const subject = escapeHtml(customSubject || `Update: ${details.phaseName} Completed`);
    const greeting = escapeHtml(customGreeting || `Hello ${details.customerName},`);
    const message = escapeHtml(customMessage || `We're writing to let you know that "${details.phaseName}" has been completed.\n\nPlease let us know if anything is pending regarding the same`);

    // Build payment block if payment amount provided
    let paymentBlock = '';
    if (customPaymentAmount && Number(customPaymentAmount) > 0) {
      paymentBlock = `
        <div style="margin-top: 20px; padding: 20px; background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; text-align: center;">
          <h2 style="color: #9a3412; font-size: 16px; margin-bottom: 10px;">Payment Request: ${details.phaseName}</h2>
          <div style="background-color: #ffffff; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c2410c;">
              Amount Due: ₹${Number(customPaymentAmount).toLocaleString()}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">
              Current Payment Status: <strong>${details.paymentStatus}</strong>
            </p>
          </div>
        </div>
      `;
    }

    // Build completion block if final phase
    const [[{ total }]]: any = await pool.execute('SELECT COUNT(*) as total FROM job_phases WHERE job_id = ?', [details.jobId]);
    const [[{ completed }]]: any = await pool.execute('SELECT COUNT(*) as completed FROM job_phases WHERE job_id = ? AND is_completed = 1', [details.jobId]);
    const isFinalPhase = (total === completed);

    let completionBlock = '';
    if (isFinalPhase) {
      completionBlock = `
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border: 2px dashed #2563eb; border-radius: 12px; text-align: center;">
          <h2 style="color: #1e3a8a; font-size: 18px; margin-bottom: 10px;">Project Successfully Completed!</h2>
          <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">Your system is now fully operational.</p>
          <div style="background-color: ${details.paymentStatus === 'Fully Received' ? '#ecfdf5' : '#fff7ed'}; border: 1px solid ${details.paymentStatus === 'Fully Received' ? '#10b981' : '#f97316'}; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; font-weight: bold; color: ${details.paymentStatus === 'Fully Received' ? '#065f46' : '#9a3412'};">
              Payment Status: ${details.paymentStatus.toUpperCase()}
            </p>
          </div>
        </div>
      `;
    }

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Satguru Engineers Service Update</h1>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p>${greeting}</p>
          <p style="white-space: pre-wrap;">${message}</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #2563eb;">Phase: ${details.phaseName}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Technician: ${details.technician}</p>
          </div>
          ${paymentBlock}
          ${completionBlock}
          <p style="margin-top: 16px; font-size: 14px; color: #64748b;">Thank you for choosing Satguru Engineers.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} Satguru Engineers.
        </div>
      </div>
    `;

    // Fetch mail transport preference
    let mailTransport = 'smtp';
    try {
      const [rows]: any = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = "mail_transport"');
      if (rows.length > 0) mailTransport = rows[0].setting_value;
    } catch (err) {
      console.error("Error fetching mail setting:", err);
    }

    const fromEmail = mailTransport === 'google_oauth' 
      ? (process.env.GMAIL_USER || 'contactsatguruengineers@gmail.com')
      : (process.env.EMAIL_USER || 'contact@satguruengineers.com');

    const mailResult = await sendEmail(fromEmail, details.email, subject, "", htmlBody);
    const emailStatus = mailResult.success ? 'sent' : 'failed';
    await pool.execute('UPDATE job_phases SET email_status = ? WHERE id = ?', [emailStatus, id]);
    res.json({ success: true, emailSent: mailResult.success, emailError: mailResult.error });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

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

app.post('/api/inventory', authenticateToken, isAdminOrSuperAdmin, validate(inventoryItemSchema), async (req, res) => {
  const { modelName, brand, type, tonnage, starRating, quantity, soldQuantity, ourPrice, salePrice } = req.body;
  if (!modelName || !brand) {
    return res.status(400).json({ error: 'Model name and brand are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result]: any = await connection.execute(
      'INSERT INTO inventory (model_name, brand, type, tonnage, star_rating, quantity, sold_quantity, our_price, sale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [modelName, brand, type || null, tonnage || null, starRating || null, quantity || 0, soldQuantity || 0, ourPrice || 0, salePrice || 0]
    );
    const newId = result.insertId;

    if (quantity > 0) {
      await connection.execute(
        'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [newId, req.user.email, 'ADDED_STOCK', quantity, 0, quantity]
      );
    }
    await connection.commit();

    res.json({ id: newId, success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/inventory/:id', authenticateToken, isAdminOrSuperAdmin, validate(inventoryItemSchema), async (req, res) => {
  const { id } = req.params;
  const { modelName, brand, type, tonnage, starRating, quantity, soldQuantity, ourPrice, salePrice } = req.body;
  if (!modelName || !brand) {
    return res.status(400).json({ error: 'Model name and brand are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch previous state to calculate diffs
    const [oldRows]: any = await connection.execute('SELECT quantity, sold_quantity FROM inventory WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }

    const oldQty = oldRows[0].quantity;
    const oldSoldQty = oldRows[0].sold_quantity;

    // Calculate effective available stock before and after
    const oldAvailable = oldQty - oldSoldQty;
    const newAvailable = (quantity || 0) - (soldQuantity || 0);

    await connection.execute(
      'UPDATE inventory SET model_name = ?, brand = ?, type = ?, tonnage = ?, star_rating = ?, quantity = ?, sold_quantity = ?, our_price = ?, sale_price = ? WHERE id = ?',
      [modelName, brand, type || null, tonnage || null, starRating || null, quantity || 0, soldQuantity || 0, ourPrice || 0, salePrice || 0, id]
    );

    // Determine what changed for the audit log
    if (quantity > oldQty) {
      const added = quantity - oldQty;
      await connection.execute(
        'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.email, 'ADDED_STOCK', added, oldAvailable, newAvailable]
      );
    } else if (soldQuantity > oldSoldQty) {
      const sold = soldQuantity - oldSoldQty;
      await connection.execute(
        'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.email, 'SOLD_STOCK', -sold, oldAvailable, newAvailable]
      );
    } else if (quantity !== oldQty || soldQuantity !== oldSoldQty) {
      // Manual correction or other change
      await connection.execute(
        'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.email, 'UPDATED_DETAILS', newAvailable - oldAvailable, oldAvailable, newAvailable]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/inventory/history', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT h.id, i.model_name as modelName, i.brand, h.user_email as userEmail, h.action_type as actionType, h.quantity_change as quantityChange, h.previous_quantity as previousQuantity, h.new_quantity as newQuantity, h.created_at as createdAt, c.name as customerName, h.job_id as jobId FROM inventory_history h JOIN inventory i ON h.inventory_id = i.id LEFT JOIN jobs j ON h.job_id = j.id LEFT JOIN customers c ON j.customer_id = c.id ORDER BY h.created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/inventory/history ERROR:", err.message);
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




// --- MATERIAL LOG ROUTES ---

app.get('/api/material-logs', authenticateToken, async (req, res) => {
  try {
    const { type, technician, search } = req.query;
    let query = `
      SELECT ml.id, ml.material_type as materialType, ml.date, ml.technician_name as technicianName, ml.created_at as createdAt,
      (SELECT COALESCE(SUM(sent_qty), 0) FROM material_log_items WHERE material_log_id = ml.id) as totalSent,
      (SELECT COALESCE(SUM(used_qty), 0) FROM material_log_items WHERE material_log_id = ml.id) as totalUsed,
      (SELECT COALESCE(SUM(returned_qty), 0) FROM material_log_items WHERE material_log_id = ml.id) as totalReturned
      FROM material_logs ml
    `;
    const params: any[] = [];
    const conditions = [];

    if (type) {
      conditions.push('ml.material_type = ?');
      params.push(type);
    }

    // Admins see all, techs see their own unless admin requested a specific tech
    if (req.user.role === 'technician') {
      conditions.push('LOWER(ml.technician_name) = LOWER(?)');
      params.push(req.user.email);
    } else if (technician) {
      conditions.push('LOWER(ml.technician_name) = LOWER(?)');
      params.push(technician);
    }

    if (search) {
      conditions.push('(ml.technician_name LIKE ?)');
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY ml.date DESC, ml.created_at DESC';

    const [logs]: any = await pool.execute(query, params);

    for (let log of logs) {
      const [items]: any = await pool.execute('SELECT id, item_name as itemName, sent_qty as sentQty, used_qty as usedQty, returned_qty as returnedQty, notes FROM material_log_items WHERE material_log_id = ? ORDER BY id ASC', [log.id]);
      log.items = items;
    }

    res.json(logs);
  } catch (err: any) {
    console.error("Error fetching material logs:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/material-logs', authenticateToken, isAdminOrSuperAdmin, validate(materialLogSchema), async (req, res) => {
  const { materialType, date, technicianName, items } = req.body;
  if (!materialType || !date || !technicianName || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.execute(
      'INSERT INTO material_logs (material_type, date, technician_name) VALUES (?, ?, ?)',
      [materialType, date, technicianName]
    );
    const logId = result.insertId;

    for (let item of items) {
      await connection.execute(
        'INSERT INTO material_log_items (material_log_id, item_name, sent_qty, used_qty, returned_qty, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [logId, item.itemName, item.sentQty || 0, item.usedQty || 0, item.returnedQty || 0, item.notes || null]
      );
    }

    await connection.commit();
    res.json({ success: true, id: logId });
  } catch (err: any) {
    await connection.rollback();
    console.error("Error creating material log:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/material-logs/:id', authenticateToken, isAdminOrSuperAdmin, validate(materialLogUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const { materialType, date, items } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (materialType || date) {
      let updateQ = 'UPDATE material_logs SET ';
      const updates = [];
      const params = [];
      if (materialType) { updates.push('material_type = ?'); params.push(materialType); }
      if (date) { updates.push('date = ?'); params.push(date); }
      updateQ += updates.join(', ') + ' WHERE id = ?';
      params.push(id);
      await connection.execute(updateQ, params);
    }

    if (items && Array.isArray(items)) {
      await connection.execute('DELETE FROM material_log_items WHERE material_log_id = ?', [id]);
      for (let item of items) {
        await connection.execute(
          'INSERT INTO material_log_items (material_log_id, item_name, sent_qty, used_qty, returned_qty, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [id, item.itemName, item.sentQty || 0, item.usedQty || 0, item.returnedQty || 0, item.notes || null]
        );
      }
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    console.error("Error updating material log:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/material-logs/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM material_logs WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting material log:", err);
    res.status(500).json({ error: err.message });
  }
});



// --- DAILY WORK LOGS ---

app.get('/api/daily-work', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT dwl.id, dwl.job_id AS jobId, dwl.date, dwl.work_description AS work_description, dwl.qty, u.email AS technician, dwl.technician_id AS technician_id, dwl.remarks, dwl.address, dwl.created_at AS createdAt
      FROM daily_work_logs dwl
      LEFT JOIN users u ON dwl.technician_id = u.id
      ORDER BY dwl.date DESC, dwl.id DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/daily-work', authenticateToken, isAdminOrSuperAdmin, validate(dailyWorkSchema), async (req, res) => {
  try {
    const { date, work_description, qty, technician, remarks, address } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    let technicianId = null;
    if (technician) {
      const [[userRow]]: any = await pool.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [technician]);
      technicianId = userRow ? userRow.id : null;
    }

    const [result]: any = await pool.execute(
      'INSERT INTO daily_work_logs (job_id, date, work_description, qty, technician_id, remarks, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [null, date, work_description || '', qty || '0', technicianId, remarks || '', address || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/daily-work/:id', authenticateToken, isAdminOrSuperAdmin, validate(dailyWorkSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, work_description, qty, technician, remarks, address } = req.body;

    let technicianId = null;
    if (technician) {
      const [[userRow]]: any = await pool.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [technician]);
      technicianId = userRow ? userRow.id : null;
    }

    await pool.execute(
      'UPDATE daily_work_logs SET date = ?, work_description = ?, qty = ?, technician_id = ?, remarks = ?, address = ? WHERE id = ?',
      [date, work_description || '', qty || '0', technicianId, remarks || '', address || '', id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/daily-work/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM daily_work_logs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- TECHNICIAN WORK LOGS (reuses daily_work_logs table, filtered by user) ---

app.get('/api/technician-work', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role === 'technician') {
      const [rows] = await pool.execute(
        `SELECT dwl.id, dwl.job_id AS jobId, dwl.date, dwl.work_description AS work_description, dwl.qty, u.email AS technician, dwl.technician_id AS technician_id, dwl.remarks, dwl.address, dwl.created_at AS createdAt
         FROM daily_work_logs dwl
         LEFT JOIN users u ON dwl.technician_id = u.id
         WHERE dwl.technician_id = ?
         ORDER BY dwl.date DESC, dwl.id DESC`,
        [req.user.id]
      );
      return res.json(rows);
    } else if (role === 'superadmin') {
      const [rows] = await pool.execute(
        `SELECT dwl.id, dwl.job_id AS jobId, dwl.date, dwl.work_description AS work_description, dwl.qty, u.email AS technician, dwl.technician_id AS technician_id, dwl.remarks, dwl.address, dwl.created_at AS createdAt
         FROM daily_work_logs dwl
         LEFT JOIN users u ON dwl.technician_id = u.id
         ORDER BY dwl.date DESC, dwl.id DESC`
      );
      return res.json(rows);
    }
    return res.status(403).json({ error: 'Access denied' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/technician-work', authenticateToken, validate(technicianWorkSchema), async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== 'technician') return res.status(403).json({ error: 'Only technicians can add work entries' });

    const { date, work_description, qty, remarks, address } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const [result]: any = await pool.execute(
      'INSERT INTO daily_work_logs (job_id, date, work_description, qty, technician_id, remarks, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [null, date, work_description || '', qty || '0', req.user.id, remarks || '', address || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/technician-work/:id', authenticateToken, validate(technicianWorkSchema), async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== 'technician') return res.status(403).json({ error: 'Only technicians can edit their work entries' });

    const { id } = req.params;
    const { date, work_description, qty, remarks, address } = req.body;

    // Verify ownership
    const [existing]: any = await pool.execute('SELECT technician_id FROM daily_work_logs WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Entry not found' });
    if (existing[0].technician_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own entries' });
    }

    await pool.execute(
      'UPDATE daily_work_logs SET date = ?, work_description = ?, qty = ?, remarks = ?, address = ? WHERE id = ?',
      [date, work_description || '', qty || '0', remarks || '', address || '', id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/technician-work/:id', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== 'technician') return res.status(403).json({ error: 'Only technicians can delete their work entries' });

    const { id } = req.params;

    // Verify ownership
    const [existing]: any = await pool.execute('SELECT technician_id FROM daily_work_logs WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Entry not found' });
    if (existing[0].technician_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }

    await pool.execute('DELETE FROM daily_work_logs WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});




// --- JOB-SPECIFIC MATERIAL ENDPOINTS ---

// Copper Piping
app.get('/api/material/copper', authenticateToken, async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
  try {
    const [rows] = await pool.execute(
      "SELECT id, job_id AS jobId, DATE_FORMAT(date, '%Y-%m-%d') AS date, description AS size, sent_qty AS sentQty, return_qty AS returnQty, (sent_qty - return_qty) AS usedQty, created_at AS createdAt FROM material_logs WHERE job_id = ? AND category = 'copper' ORDER BY date DESC, id DESC",
      [jobId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/material/copper', authenticateToken, validate(copperSchema), async (req, res) => {
  const { jobId, date, size, sentQty, returnQty } = req.body;
  if (!jobId || !date || !size || sentQty === undefined || returnQty === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert copper log entry for the job
    const usedQty = Number(sentQty) - Number(returnQty);
    const [result]: any = await connection.execute(
      "INSERT INTO material_logs (job_id, date, category, description, sent_qty, return_qty, used_qty) VALUES (?, ?, 'copper', ?, ?, ?, ?)",
      [jobId, date, size, sentQty, returnQty, usedQty]
    );

    // 2. Update stock in inventory_copper: stock = stock + returnQty - sentQty
    const netChange = Number(returnQty) - Number(sentQty);
    await connection.execute(
      'UPDATE inventory_copper SET total_in_stock = total_in_stock + ? WHERE size = ?',
      [netChange, size]
    );

    await connection.commit();
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/material/copper/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch log details to get size, sentQty, returnQty
    const [logs]: any = await connection.execute(
      "SELECT description AS size, sent_qty AS sentQty, return_qty AS returnQty FROM material_logs WHERE id = ? AND category = 'copper'",
      [req.params.id]
    );

    if (logs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Log not found' });
    }
    const { size, sentQty, returnQty } = logs[0];

    // 2. Reverse stock recalculation in inventory_copper: stock = stock + sentQty - returnQty
    const netUsed = Number(sentQty) - Number(returnQty);
    await connection.execute(
      'UPDATE inventory_copper SET total_in_stock = total_in_stock + ? WHERE size = ?',
      [netUsed, size]
    );

    // 3. Delete the log entry
    await connection.execute(
      "DELETE FROM material_logs WHERE id = ? AND category = 'copper'",
      [req.params.id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Drain Pipe
app.get('/api/material/drain', authenticateToken, async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
  try {
    const [rows] = await pool.execute(
      "SELECT id, job_id AS jobId, DATE_FORMAT(date, '%Y-%m-%d') AS date, used_qty AS usedQty, created_at AS createdAt FROM material_logs WHERE job_id = ? AND category = 'drain' ORDER BY date DESC, id DESC",
      [jobId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/material/drain', authenticateToken, validate(drainSchema), async (req, res) => {
  const { jobId, date, usedQty } = req.body;
  if (!jobId || !date || usedQty === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [result]: any = await pool.execute(
      "INSERT INTO material_logs (job_id, date, category, description, sent_qty, return_qty, used_qty) VALUES (?, ?, 'drain', NULL, 0.00, 0.00, ?)",
      [jobId, date, usedQty]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/material/drain/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM material_logs WHERE id = ? AND category = 'drain'", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remote
app.get('/api/material/remote', authenticateToken, async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
  try {
    const [rows] = await pool.execute(
      "SELECT id, job_id AS jobId, DATE_FORMAT(date, '%Y-%m-%d') AS date, used_qty AS usedQty, description AS type, created_at AS createdAt FROM material_logs WHERE job_id = ? AND category = 'remote' ORDER BY date DESC, id DESC",
      [jobId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/material/remote', authenticateToken, validate(remoteSchema), async (req, res) => {
  const { jobId, date, usedQty, type } = req.body;
  if (!jobId || !date || usedQty === undefined || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['wired', 'wireless', 'sensor'].includes(type)) {
    return res.status(400).json({ error: 'Invalid remote type' });
  }
  try {
    const [result]: any = await pool.execute(
      "INSERT INTO material_logs (job_id, date, category, description, sent_qty, return_qty, used_qty) VALUES (?, ?, 'remote', ?, 0.00, 0.00, ?)",
      [jobId, date, type, usedQty]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/material/remote/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM material_logs WHERE id = ? AND category = 'remote'", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Others
app.get('/api/material/others', authenticateToken, async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
  try {
    const [rows] = await pool.execute(
      "SELECT id, job_id AS jobId, DATE_FORMAT(date, '%Y-%m-%d') AS date, description, used_qty AS qty, created_at AS createdAt FROM material_logs WHERE job_id = ? AND category = 'other' ORDER BY date DESC, id DESC",
      [jobId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/material/others', authenticateToken, validate(othersSchema), async (req, res) => {
  const { jobId, date, description, qty } = req.body;
  if (!jobId || !date || !description || qty === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [result]: any = await pool.execute(
      "INSERT INTO material_logs (job_id, date, category, description, sent_qty, return_qty, used_qty) VALUES (?, ?, 'other', ?, 0.00, 0.00, ?)",
      [jobId, date, description, qty]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/material/others/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM material_logs WHERE id = ? AND category = 'other'", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AC Model
app.get('/api/inventory/available-models', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, model_name as modelName, brand, type, tonnage, star_rating as starRating, (quantity - sold_quantity) as availableQty, sale_price as salePrice FROM inventory WHERE quantity > sold_quantity ORDER BY model_name ASC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/material/ac-model', authenticateToken, async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
  try {
    const [rows] = await pool.execute(
      "SELECT id, job_id AS jobId, DATE_FORMAT(date, '%Y-%m-%d') AS date, description, used_qty AS qty, created_at AS createdAt FROM material_logs WHERE job_id = ? AND category = 'ac_model' ORDER BY date DESC, id DESC",
      [jobId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/material/ac-model', authenticateToken, validate(acModelSchema), async (req, res) => {
  const { jobId, date, inventoryId } = req.body;
  if (!jobId || !date || !inventoryId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.execute(
      'SELECT quantity, sold_quantity, model_name, brand, tonnage, star_rating FROM inventory WHERE id = ?',
      [inventoryId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const { quantity, sold_quantity, model_name, brand, tonnage, star_rating } = rows[0];
    const available = quantity - sold_quantity;

    if (available <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'This AC model is out of stock' });
    }

    await connection.execute(
      'UPDATE inventory SET sold_quantity = sold_quantity + 1 WHERE id = ?',
      [inventoryId]
    );

    await connection.execute(
      'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity, job_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [inventoryId, req.user.email, 'SOLD_STOCK', -1, available, available - 1, jobId]
    );

    const logDesc = `[InventoryID:${inventoryId}] ${brand} ${model_name} (${tonnage || ''} Ton, ${star_rating || ''} Star)`;
    const [result]: any = await connection.execute(
      "INSERT INTO material_logs (job_id, date, category, description, sent_qty, return_qty, used_qty) VALUES (?, ?, 'ac_model', ?, 0.00, 0.00, 1.00)",
      [jobId, date, logDesc]
    );

    await connection.commit();
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/material/ac-model/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [logs]: any = await connection.execute(
      "SELECT job_id, description FROM material_logs WHERE id = ? AND category = 'ac_model'",
      [id]
    );

    if (logs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Material log not found' });
    }

    const job_id = logs[0].job_id;
    const description = logs[0].description || '';
    const match = description.match(/^\[InventoryID:(\d+)\]/);
    const inventoryId = match ? parseInt(match[1]) : null;

    if (inventoryId) {
      const [invRows]: any = await connection.execute(
        'SELECT quantity, sold_quantity FROM inventory WHERE id = ?',
        [inventoryId]
      );
      if (invRows.length > 0) {
        const { quantity, sold_quantity } = invRows[0];
        const available = quantity - sold_quantity;

        await connection.execute(
          'UPDATE inventory SET sold_quantity = GREATEST(0, sold_quantity - 1) WHERE id = ?',
          [inventoryId]
        );

        await connection.execute(
          'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity, job_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [inventoryId, req.user.email, 'RETURNED_STOCK', 1, available, available + 1, job_id]
        );
      }
    }

    await connection.execute(
      "DELETE FROM material_logs WHERE id = ? AND category = 'ac_model'",
      [id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});


// --- INVENTORY COPPER ROUTES ---
app.get('/api/inventory/copper', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, size, group_name AS groupName, total_in_stock AS totalInStock, created_at AS createdAt, updated_at AS updatedAt FROM inventory_copper ORDER BY size ASC"
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/copper/logs', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date, size, sent_qty AS sentQty, return_qty AS returnQty, created_at AS createdAt, 'warehouse' AS origin FROM copper_warehouse_logs 
       UNION ALL 
       SELECT ml.id, DATE_FORMAT(ml.date, '%Y-%m-%d') AS date, ml.description AS size, ml.sent_qty AS sentQty, ml.return_qty AS returnQty, ml.created_at AS createdAt, COALESCE(c.name, 'job') AS origin 
       FROM material_logs ml
       LEFT JOIN jobs j ON ml.job_id = j.id
       LEFT JOIN customers c ON j.customer_id = c.id
       WHERE ml.category = 'copper'
       ORDER BY date DESC, id DESC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/copper', authenticateToken, isAdminOrSuperAdmin, validate(copperInventorySchema), async (req, res) => {
  const { size, totalInStock, groupName } = req.body;
  if (!size || totalInStock === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert or update stock in inventory_copper
    const [result]: any = await connection.execute(
      'INSERT INTO inventory_copper (size, total_in_stock, group_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE total_in_stock = total_in_stock + ?',
      [size, totalInStock, groupName || 'Standard Sizes', totalInStock]
    );

    // 2. Insert warehouse log entry: sent_qty = 0, return_qty = totalInStock
    const dateStr = new Date().toISOString().split('T')[0];
    await connection.execute(
      'INSERT INTO copper_warehouse_logs (date, size, sent_qty, return_qty) VALUES (?, ?, 0, ?)',
      [dateStr, size, totalInStock]
    );

    await connection.commit();
    res.json({ success: true, id: result.insertId || null });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/inventory/copper/:id', authenticateToken, isAdminOrSuperAdmin, validate(copperInventoryUpdateSchema), async (req, res) => {
  const { size, sentQty, returnQty } = req.body;
  if (!size || sentQty === undefined || returnQty === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert log entry
    const dateStr = new Date().toISOString().split('T')[0];
    await connection.execute(
      'INSERT INTO copper_warehouse_logs (date, size, sent_qty, return_qty) VALUES (?, ?, ?, ?)',
      [dateStr, size, sentQty, returnQty]
    );

    // 2. Update stock: total_in_stock = total_in_stock + return_qty - sent_qty
    const netChange = Number(returnQty) - Number(sentQty);
    await connection.execute(
      'UPDATE inventory_copper SET total_in_stock = total_in_stock + ? WHERE id = ?',
      [netChange, req.params.id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/inventory/copper/size/:id', authenticateToken, isAdminOrSuperAdmin, validate(copperSizeSchema), async (req, res) => {
  const { newSize } = req.body;
  if (!newSize) {
    return res.status(400).json({ error: 'newSize is required' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch old size
    const [rows]: any = await connection.execute(
      'SELECT size FROM inventory_copper WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Copper size item not found' });
    }
    const oldSize = rows[0].size;

    // 2. Update size in inventory_copper (this cascades to copper_warehouse_logs)
    await connection.execute(
      'UPDATE inventory_copper SET size = ? WHERE id = ?',
      [newSize, req.params.id]
    );

    // 3. Update size in material_logs (category = 'copper')
    await connection.execute(
      "UPDATE material_logs SET description = ? WHERE description = ? AND category = 'copper'",
      [newSize, oldSize]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.put('/api/inventory/copper/group/:id', authenticateToken, isAdminOrSuperAdmin, validate(copperGroupSchema), async (req, res) => {
  const { groupName: newGroup } = req.body;
  if (!newGroup) {
    return res.status(400).json({ error: 'groupName is required' });
  }
  const connection = await pool.getConnection();
  let rows: any = null;
  try {
    await connection.beginTransaction();
    
    // 1. Fetch current size and group
    const [fetchedRows]: any = await connection.execute(
      'SELECT size, group_name AS groupName FROM inventory_copper WHERE id = ?',
      [req.params.id]
    );
    rows = fetchedRows;
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Copper size not found' });
    }
    
    const { size, groupName: oldGroup } = rows[0];
    
    // 2. Clean current size of its old group prefix
    let cleanSize = size.trim();
    if (oldGroup && oldGroup !== 'Standard Sizes') {
      const prefix = new RegExp('^' + oldGroup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s+', 'i');
      cleanSize = cleanSize.replace(prefix, '').trim();
    }
    cleanSize = cleanSize.replace(/^(Homes|Home)\s+/i, '').trim();
    
    // 3. Generate new size with new group prefix
    let newSize = cleanSize;
    if (newGroup !== 'Standard Sizes') {
      newSize = newGroup + ' ' + cleanSize;
    }
    
    // 4. Update the item
    await connection.execute(
      'UPDATE inventory_copper SET size = ?, group_name = ? WHERE id = ?',
      [newSize, newGroup, req.params.id]
    );
    
    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const cleanSize = rows && rows[0] ? rows[0].size.replace(/^(Homes|Home)\s+/i, '').trim() : '';
      res.status(400).json({ error: `A copper pipe size '${cleanSize}' already exists in group '${newGroup}'.` });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    connection.release();
  }
});

app.delete('/api/inventory/copper/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch size name
    const [rows]: any = await connection.execute(
      'SELECT size FROM inventory_copper WHERE id = ?',
      [req.params.id]
    );
    if (rows.length > 0) {
      const sizeName = rows[0].size;

      // 2. Delete logs referencing this size in copper_warehouse_logs
      await connection.execute(
        'DELETE FROM copper_warehouse_logs WHERE size = ?',
        [sizeName]
      );

      // 3. Delete material logs referencing this size
      await connection.execute(
        "DELETE FROM material_logs WHERE description = ? AND category = 'copper'",
        [sizeName]
      );
    }

    // 4. Delete the copper size itself
    await connection.execute('DELETE FROM inventory_copper WHERE id = ?', [req.params.id]);

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/inventory/copper/logs/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete the log entry
    await connection.execute(
      'DELETE FROM copper_warehouse_logs WHERE id = ?',
      [req.params.id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});


// Centralized Express Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Centralized Error Handler caught:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && (err.message.includes('File type not allowed') || err.message.includes('Unsupported file type'))) {
    return res.status(400).json({ error: err.message });
  }
  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV !== 'development' 
    ? 'Internal server error' 
    : err.message || 'Something went wrong';
  res.status(status).json({ error: message });
});

// Serve React frontend
const __dirnameResolved = path.resolve();

app.use(express.static(path.join(__dirnameResolved, "dist")));

app.get("*", (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirnameResolved, "dist", "index.html"));
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});


