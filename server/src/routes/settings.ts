import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

function parseSetting(row: any) {
  switch (row.value_type) {
    case 'integer': return parseInt(row.setting_value, 10);
    case 'boolean': return row.setting_value === 'true' || row.setting_value === '1';
    case 'json':
      try { return JSON.parse(row.setting_value); } catch(e) { return row.setting_value; }
    default:        return row.setting_value;
  }
}

router.get('/settings', authenticateToken, isSuperAdmin, async (req, res) => {
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

router.put('/settings', authenticateToken, isSuperAdmin, async (req, res) => {
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

router.delete('/settings/cleanup-audit-logs', authenticateToken, isSuperAdmin, async (req, res) => {
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

router.get('/config', async (req, res) => {
  try {
    const [rows]: any = await pool.execute('SELECT setting_key, value_type, setting_value FROM settings WHERE setting_key IN ("company_phone", "company_email", "whatsapp_enabled")');
    const config: Record<string, any> = {
      company_phone: '95922 92292',
      company_email: 'contactsatguruengineer@gmail.com',
      whatsapp_enabled: true
    };
    rows.forEach((row: any) => {
      config[row.setting_key] = parseSetting(row);
    });
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
