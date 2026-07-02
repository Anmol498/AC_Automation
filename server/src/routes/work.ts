import express from 'express';
import pool from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { dailyWorkSchema, technicianWorkSchema } from '../schemas/work.js';
import { authenticateToken, isAdminOrSuperAdmin, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// --- DAILY WORK LOGS ---
router.get('/daily-work', authenticateToken, async (req, res) => {
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

router.post('/daily-work', authenticateToken, isAdminOrSuperAdmin, validate(dailyWorkSchema), async (req, res) => {
  try {
    const { date, work_description, qty, technician, remarks, address } = req.body;

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

router.put('/daily-work/:id', authenticateToken, isAdminOrSuperAdmin, validate(dailyWorkSchema), async (req, res) => {
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

router.delete('/daily-work/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM daily_work_logs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- TECHNICIAN WORK LOGS ---
router.get('/technician-work', authenticateToken, async (req, res) => {
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
    } else if (role === 'superadmin' || role === 'admin') {
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

router.post('/technician-work', authenticateToken, validate(technicianWorkSchema), async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== 'technician') return res.status(403).json({ error: 'Only technicians can add work entries' });

    const { date, work_description, qty, remarks, address } = req.body;

    const [result]: any = await pool.execute(
      'INSERT INTO daily_work_logs (job_id, date, work_description, qty, technician_id, remarks, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [null, date, work_description || '', qty || '0', req.user.id, remarks || '', address || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/technician-work/:id', authenticateToken, validate(technicianWorkSchema), async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== 'technician') return res.status(403).json({ error: 'Only technicians can edit their work entries' });

    const { id } = req.params;
    const { date, work_description, qty, remarks, address } = req.body;

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

router.delete('/technician-work/:id', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase();
    if (role !== 'technician') return res.status(403).json({ error: 'Only technicians can delete their work entries' });

    const { id } = req.params;

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

// --- CASH FLOW LOGS ---
router.get('/cash-flow', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM cash_flow ORDER BY date DESC, id DESC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cash-flow', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { date, received, from_source, expenditure, on_source, sent_home } = req.body;
    const finalDate = date || new Date().toISOString().split('T')[0];
    const recVal = parseFloat(received) || 0;
    const expVal = parseFloat(expenditure) || 0;
    const homeVal = parseFloat(sent_home) || 0;
    const balVal = recVal - expVal;

    const [result]: any = await pool.execute(
      'INSERT INTO cash_flow (date, received, from_source, expenditure, on_source, sent_home, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [finalDate, recVal, from_source || '', expVal, on_source || '', homeVal, balVal]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/cash-flow/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, received, from_source, expenditure, on_source, sent_home } = req.body;
    const finalDate = date || new Date().toISOString().split('T')[0];
    const recVal = parseFloat(received) || 0;
    const expVal = parseFloat(expenditure) || 0;
    const homeVal = parseFloat(sent_home) || 0;
    const balVal = recVal - expVal;

    await pool.execute(
      'UPDATE cash_flow SET date = ?, received = ?, from_source = ?, expenditure = ?, on_source = ?, sent_home = ?, balance = ? WHERE id = ?',
      [finalDate, recVal, from_source || '', expVal, on_source || '', homeVal, balVal, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cash-flow/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM cash_flow WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
