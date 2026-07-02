import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { 
  loginSchema, 
  changePasswordSchema, 
  createUserSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema,
  updateUserSchema,
  updateAccountInfoSchema
} from '../schemas/auth.js';
import { authenticateToken, isSuperAdmin, JWT_SECRET } from '../middleware/auth.js';
import { addClient } from '../utils/sse.js';
import { getFromEmail, buildEmailLayout } from '../utils/emailHelper.js';
import { sendEmail } from '../utils/mailer.js';
import { sendWhatsAppMessage } from '../utils/whatsappHelper.js';

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';

router.post('/login', validate(loginSchema), async (req, res) => {
  let { email, password } = req.body;
  email = email?.toLowerCase();
  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = users[0];
    let validPass = false;
    try {
      validPass = await bcrypt.compare(password, user.password_hash);
    } catch (e) {
      validPass = false;
    }

    if (!validPass) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshTokenHash, expiresAt]
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token,
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

router.post('/auth/refresh', async (req, res) => {
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

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

router.post('/auth/logout', async (req, res) => {
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

router.get('/auth/status', authenticateToken, (req, res) => {
  res.json({
    isAuthenticated: true,
    user: { id: req.user.id, email: req.user.email, role: req.user.role }
  });
});

router.get('/realtime', (req, res) => {
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

router.put('/auth/change-password', authenticateToken, validate(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

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

router.get('/users', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, email, role, phone FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', authenticateToken, isSuperAdmin, validate(createUserSchema), async (req, res) => {
  let { email, password, role, phone } = req.body;
  email = email?.toLowerCase();
  role = role?.toLowerCase();
  const userPhone = phone || null;

  const allowedRoles = ['admin', 'superadmin', 'technician'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role: ${role}. Allowed roles: ${allowedRoles.join(', ')}` });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (email, password_hash, role, phone) VALUES (?, ?, ?, ?)', [email, hashedPassword, role, userPhone]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', authenticateToken, isSuperAdmin, validate(updateUserSchema), async (req, res) => {
  const { id } = req.params;
  let { email, password, role, phone } = req.body;

  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (email !== undefined) {
      const emailLower = email?.toLowerCase()?.trim();
      updateFields.push('email = ?');
      values.push(emailLower);
    }

    if (role !== undefined) {
      const roleLower = role?.toLowerCase()?.trim();
      const allowedRoles = ['admin', 'superadmin', 'technician'];
      if (!allowedRoles.includes(roleLower)) {
        return res.status(400).json({ error: `Invalid role: ${roleLower}. Allowed roles: ${allowedRoles.join(', ')}` });
      }
      updateFields.push('role = ?');
      values.push(roleLower);
    }

    if (phone !== undefined) {
      updateFields.push('phone = ?');
      values.push(phone || null);
    }

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password_hash = ?');
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No changes made.' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password Flow Endpoints
router.post('/auth/forgot-password/request', validate(forgotPasswordRequestSchema), async (req, res) => {
  let { email, method } = req.body;
  email = email?.toLowerCase()?.trim();

  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }
    const user = users[0];

    // Guard: reject WhatsApp method if globally disabled
    if (method === 'whatsapp') {
      const [waRows]: any = await pool.execute("SELECT setting_value FROM settings WHERE setting_key = 'whatsapp_enabled'");
      const waEnabled = waRows.length === 0 || waRows[0].setting_value === 'true' || waRows[0].setting_value === '1';
      if (!waEnabled) {
        return res.status(400).json({ error: 'WhatsApp is currently disabled. Please use Email.' });
      }
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save to password_resets
    await pool.execute(
      'INSERT INTO password_resets (user_id, otp_code, otp_expires_at, verified) VALUES (?, ?, ?, FALSE)',
      [user.id, otpCode, otpExpires]
    );

    if (method === 'email') {
      const fromEmail = await getFromEmail(pool);
      const subject = 'Password Reset OTP - Satguru Engineers';
      const text = `Your password reset OTP is ${otpCode}. It is valid for 5 minutes.`;
      const html = buildEmailLayout(
        'Password Reset Request',
        `
        <p>Hello,</p>
        <p>We received a request to reset the password for your Satguru Engineers account.</p>
        <p>Use the following One-Time Password (OTP) to proceed with your password recovery. It is valid for <strong>5 minutes</strong>:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 6px;">${otpCode}</span>
        </div>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        `
      );

      const emailRes = await sendEmail(fromEmail, user.email, subject, text, html);
      if (!emailRes.success) {
        return res.status(500).json({ error: 'Failed to send OTP via email: ' + emailRes.error });
      }
    } else if (method === 'whatsapp') {
      if (!user.phone || user.phone.trim() === '') {
        return res.status(400).json({ 
          error: 'No registered phone number found for this account. Please use Email or contact Superadmin.' 
        });
      }
      
      const messageText = `Your Satguru Engineers password reset OTP is *${otpCode}*. It is valid for 5 minutes.`;
      const waRes = await sendWhatsAppMessage(user.phone, messageText);
      if (!waRes.success) {
        return res.status(500).json({ error: 'Failed to send OTP via WhatsApp: ' + waRes.error });
      }
    }

    res.json({ 
      success: true, 
      message: 'OTP sent successfully.', 
      phoneEnding: user.phone ? user.phone.slice(-4) : null 
    });
  } catch (err: any) {
    console.error('Request OTP Error:', err);
    res.status(500).json({ error: 'Internal server error during password reset request.' });
  }
});

router.post('/auth/forgot-password/verify', validate(forgotPasswordVerifySchema), async (req, res) => {
  let { email, otp } = req.body;
  email = email?.toLowerCase()?.trim();

  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = users[0];

    // Find latest pending, unexpired OTP
    const [resets]: any = await pool.execute(
      'SELECT * FROM password_resets WHERE user_id = ? AND verified = FALSE AND otp_expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (resets.length === 0 || resets[0].otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
    }

    const resetRecord = resets[0];
    
    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update reset record
    await pool.execute(
      'UPDATE password_resets SET verified = TRUE, reset_token = ?, reset_token_expires_at = ? WHERE id = ?',
      [resetToken, tokenExpires, resetRecord.id]
    );

    res.json({ success: true, resetToken });
  } catch (err: any) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ error: 'Internal server error during OTP verification.' });
  }
});

router.post('/auth/forgot-password/reset', validate(forgotPasswordResetSchema), async (req, res) => {
  let { email, resetToken, newPassword } = req.body;
  email = email?.toLowerCase()?.trim();

  try {
    const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = users[0];

    // Verify token is valid, verified, and unexpired
    const [resets]: any = await pool.execute(
      'SELECT * FROM password_resets WHERE user_id = ? AND reset_token = ? AND verified = TRUE AND reset_token_expires_at > NOW()',
      [user.id, resetToken]
    );

    if (resets.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please restart the process.' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);

    // Clean up reset records for this user to prevent replay attacks
    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [user.id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

router.put('/auth/change-account-info', authenticateToken, validate(updateAccountInfoSchema), async (req, res) => {
  const userId = req.user.id;
  const { email, phone } = req.body;

  try {
    const emailLower = email?.toLowerCase()?.trim();
    const [existingUsers]: any = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [emailLower, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email address is already in use by another account.' });
    }

    await pool.execute(
      'UPDATE users SET email = ?, phone = ? WHERE id = ?',
      [emailLower, phone || null, userId]
    );

    const [updatedUsers]: any = await pool.execute(
      'SELECT id, email, role, phone FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Account information updated successfully.',
      user: updatedUsers[0]
    });
  } catch (err: any) {
    console.error('Update Account Info Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
