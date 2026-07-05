import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import pool from './config/db.js';
import { ensureDatabaseReady } from './db/migrate.js';
import { broadcast } from './utils/sse.js';
import { contactLimiter } from './middleware/rateLimiters.js';
import { validate } from './middleware/validate.js';
import { contactSchema } from './schemas/contact.js';
import { escapeHtml, sanitizeHeader, getFromEmail } from './utils/emailHelper.js';
import { sendEmail } from './utils/mailer.js';
import { authenticateToken } from './middleware/auth.js';

// Route Imports
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import settingsRoutes from './routes/settings.js';
import jobRoutes from './routes/jobs.js';
import inventoryRoutes from './routes/inventory.js';
import workRoutes from './routes/work.js';
import materialRoutes from './routes/materials.js';
import whatsappRoutes from './routes/whatsapp.js';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

const APP_VERSION = "2026-03-17_V2_Modular";
console.log(`>>> SERVER STARTING - VERSION: ${APP_VERSION} <<<`);

const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Database schema initialization
ensureDatabaseReady();

const app = express();
app.use(cookieParser());

// Helmet security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
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

// CORS Configuration
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
app.options("*", cors(corsOptions)); // Preflight fix

app.use(express.json());

// Centralized Error response handling to prevent raw database leaks in production
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
        } else if (path.startsWith('/api/daily-work') || path.startsWith('/api/technician-work') || path.startsWith('/api/cash-flow')) {
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

// Serve static uploads securely
const resolvedUploadDir = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);
app.use('/api/uploads', authenticateToken, (req, res, next) => {
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length');
  if (!req.path.match(/\.(jpg|jpeg|png|webp|dwg|dxf|pdf|xlsx|xls)$/i)) {
    res.setHeader('Content-Disposition', 'attachment');
  }
  next();
}, express.static(resolvedUploadDir));

app.use('/api/uploads', (req, res) => {
  res.status(404).json({ error: 'File not found' });
});

// Health check endpoints
app.get("/", (req, res) => {
  res.status(200).send("AC Automation Backend Running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ac-automation-api",
    time: new Date()
  });
});

// Public Contact Form Endpoint
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

  const fromEmail = await getFromEmail(pool);

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

    const businessEmail = process.env.EMAIL_USER || 'contact@satguruengineers.com';
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

// Mounting Router modules
app.use('/api', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api', settingsRoutes);
app.use('/api', jobRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', workRoutes);
app.use('/api', materialRoutes);
app.use('/api', whatsappRoutes);

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

// Serve React frontend in production
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
