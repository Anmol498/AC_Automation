import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema, createUserSchema } from '../schemas/auth.js';
import { authenticateToken, isSuperAdmin, JWT_SECRET } from '../middleware/auth.js';
import { addClient } from '../utils/sse.js';

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';

router.post('/login', validate(loginSchema), async (req, res) => {
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
    const [rows] = await pool.execute('SELECT id, email, role FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', authenticateToken, isSuperAdmin, validate(createUserSchema), async (req, res) => {
  let { email, password, role } = req.body;
  email = email?.toLowerCase();
  role = role?.toLowerCase();

  const allowedRoles = ['admin', 'superadmin', 'technician'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role: ${role}. Allowed roles: ${allowedRoles.join(', ')}` });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hashedPassword, role]);
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

export default router;
