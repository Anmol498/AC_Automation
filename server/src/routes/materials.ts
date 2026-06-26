import express from 'express';
import pool from '../config/db.js';
import { validate } from '../middleware/validate.js';
import {
  copperSchema,
  drainSchema,
  remoteSchema,
  othersSchema,
  acModelSchema
} from '../schemas/material.js';
import { authenticateToken, isAdminOrSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Copper Piping
router.get('/material/copper', authenticateToken, async (req, res) => {
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

router.post('/material/copper', authenticateToken, validate(copperSchema), async (req, res) => {
  const { jobId, date, size, sentQty, returnQty } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const usedQty = Number(sentQty) - Number(returnQty);
    const [result]: any = await connection.execute(
      "INSERT INTO material_logs (job_id, date, category, description, sent_qty, return_qty, used_qty) VALUES (?, ?, 'copper', ?, ?, ?, ?)",
      [jobId, date, size, sentQty, returnQty, usedQty]
    );

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

router.delete('/material/copper/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [logs]: any = await connection.execute(
      "SELECT description AS size, sent_qty AS sentQty, return_qty AS returnQty FROM material_logs WHERE id = ? AND category = 'copper'",
      [req.params.id]
    );

    if (logs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Log not found' });
    }
    const { size, sentQty, returnQty } = logs[0];

    const netUsed = Number(sentQty) - Number(returnQty);
    await connection.execute(
      'UPDATE inventory_copper SET total_in_stock = total_in_stock + ? WHERE size = ?',
      [netUsed, size]
    );

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
router.get('/material/drain', authenticateToken, async (req, res) => {
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

router.post('/material/drain', authenticateToken, validate(drainSchema), async (req, res) => {
  const { jobId, date, usedQty } = req.body;
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

router.delete('/material/drain/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM material_logs WHERE id = ? AND category = 'drain'", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remote
router.get('/material/remote', authenticateToken, async (req, res) => {
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

router.post('/material/remote', authenticateToken, validate(remoteSchema), async (req, res) => {
  const { jobId, date, usedQty, type } = req.body;
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

router.delete('/material/remote/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM material_logs WHERE id = ? AND category = 'remote'", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Others
router.get('/material/others', authenticateToken, async (req, res) => {
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

router.post('/material/others', authenticateToken, validate(othersSchema), async (req, res) => {
  const { jobId, date, description, qty } = req.body;
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

router.delete('/material/others/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM material_logs WHERE id = ? AND category = 'other'", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AC Model
router.get('/inventory/available-models', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, model_name as modelName, brand, type, tonnage, star_rating as starRating, (quantity - sold_quantity) as availableQty, sale_price as salePrice FROM inventory WHERE quantity > sold_quantity ORDER BY model_name ASC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/material/ac-model', authenticateToken, async (req, res) => {
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

router.post('/material/ac-model', authenticateToken, validate(acModelSchema), async (req, res) => {
  const { jobId, date, inventoryId } = req.body;

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

router.delete('/material/ac-model/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
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

export default router;
