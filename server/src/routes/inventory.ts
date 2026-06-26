import express from 'express';
import pool from '../config/db.js';
import { validate } from '../middleware/validate.js';
import {
  inventoryItemSchema,
  copperInventorySchema,
  copperInventoryUpdateSchema,
  copperSizeSchema,
  copperGroupSchema
} from '../schemas/inventory.js';
import { materialLogSchema, materialLogUpdateSchema } from '../schemas/material.js';
import { authenticateToken, isAdminOrSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/inventory', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, model_name as modelName, brand, type, tonnage, star_rating as starRating, quantity, sold_quantity as soldQuantity, our_price as ourPrice, sale_price as salePrice, created_at as createdAt, updated_at as updatedAt FROM inventory ORDER BY updated_at DESC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/inventory', authenticateToken, isAdminOrSuperAdmin, validate(inventoryItemSchema), async (req, res) => {
  const { modelName, brand, type, tonnage, starRating, quantity, soldQuantity, ourPrice, salePrice } = req.body;

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
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.put('/inventory/:id', authenticateToken, isAdminOrSuperAdmin, validate(inventoryItemSchema), async (req, res) => {
  const { id } = req.params;
  const { modelName, brand, type, tonnage, starRating, quantity, soldQuantity, ourPrice, salePrice } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [oldRows]: any = await connection.execute('SELECT quantity, sold_quantity FROM inventory WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }

    const oldQty = oldRows[0].quantity;
    const oldSoldQty = oldRows[0].sold_quantity;

    const oldAvailable = oldQty - oldSoldQty;
    const newAvailable = (quantity || 0) - (soldQuantity || 0);

    await connection.execute(
      'UPDATE inventory SET model_name = ?, brand = ?, type = ?, tonnage = ?, star_rating = ?, quantity = ?, sold_quantity = ?, our_price = ?, sale_price = ? WHERE id = ?',
      [modelName, brand, type || null, tonnage || null, starRating || null, quantity || 0, soldQuantity || 0, ourPrice || 0, salePrice || 0, id]
    );

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
      await connection.execute(
        'INSERT INTO inventory_history (inventory_id, user_email, action_type, quantity_change, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.email, 'UPDATED_DETAILS', newAvailable - oldAvailable, oldAvailable, newAvailable]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.get('/inventory/history', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT h.id, i.model_name as modelName, i.brand, h.user_email as userEmail, h.action_type as actionType, h.quantity_change as quantityChange, h.previous_quantity as previousQuantity, h.new_quantity as newQuantity, h.created_at as createdAt, c.name as customerName, h.job_id as jobId FROM inventory_history h JOIN inventory i ON h.inventory_id = i.id LEFT JOIN jobs j ON h.job_id = j.id LEFT JOIN customers c ON j.customer_id = c.id ORDER BY h.created_at DESC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inventory/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory/copper', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, size, group_name AS groupName, total_in_stock AS totalInStock, created_at AS createdAt, updated_at AS updatedAt FROM inventory_copper ORDER BY size ASC"
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory/copper/logs', authenticateToken, async (req, res) => {
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

router.post('/inventory/copper', authenticateToken, isAdminOrSuperAdmin, validate(copperInventorySchema), async (req, res) => {
  const { size, totalInStock, groupName } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.execute(
      'INSERT INTO inventory_copper (size, total_in_stock, group_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE total_in_stock = total_in_stock + ?',
      [size, totalInStock, groupName || 'Standard Sizes', totalInStock]
    );

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

router.put('/inventory/copper/:id', authenticateToken, isAdminOrSuperAdmin, validate(copperInventoryUpdateSchema), async (req, res) => {
  const { size, sentQty, returnQty } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const dateStr = new Date().toISOString().split('T')[0];
    await connection.execute(
      'INSERT INTO copper_warehouse_logs (date, size, sent_qty, return_qty) VALUES (?, ?, ?, ?)',
      [dateStr, size, sentQty, returnQty]
    );

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

router.put('/inventory/copper/size/:id', authenticateToken, isAdminOrSuperAdmin, validate(copperSizeSchema), async (req, res) => {
  const { newSize } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.execute(
      'SELECT size FROM inventory_copper WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Copper size item not found' });
    }
    const oldSize = rows[0].size;

    await connection.execute(
      'UPDATE inventory_copper SET size = ? WHERE id = ?',
      [newSize, req.params.id]
    );

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

router.put('/inventory/copper/group/:id', authenticateToken, isAdminOrSuperAdmin, validate(copperGroupSchema), async (req, res) => {
  const { groupName: newGroup } = req.body;
  const connection = await pool.getConnection();
  let rows: any = null;
  try {
    await connection.beginTransaction();
    
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
    
    let cleanSize = size.trim();
    if (oldGroup && oldGroup !== 'Standard Sizes') {
      const prefix = new RegExp('^' + oldGroup.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s+', 'i');
      cleanSize = cleanSize.replace(prefix, '').trim();
    }
    cleanSize = cleanSize.replace(/^(Homes|Home)\s+/i, '').trim();
    
    let newSize = cleanSize;
    if (newGroup !== 'Standard Sizes') {
      newSize = newGroup + ' ' + cleanSize;
    }
    
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

router.delete('/inventory/copper/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.execute(
      'SELECT size FROM inventory_copper WHERE id = ?',
      [req.params.id]
    );
    if (rows.length > 0) {
      const sizeName = rows[0].size;

      await connection.execute(
        'DELETE FROM copper_warehouse_logs WHERE size = ?',
        [sizeName]
      );

      await connection.execute(
        "DELETE FROM material_logs WHERE description = ? AND category = 'copper'",
        [sizeName]
      );
    }

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

// Simplified by removing redundant transaction
router.delete('/inventory/copper/logs/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM copper_warehouse_logs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MATERIAL LOG ROUTES ---
router.get('/material-logs', authenticateToken, async (req, res) => {
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

router.post('/material-logs', authenticateToken, isAdminOrSuperAdmin, validate(materialLogSchema), async (req, res) => {
  const { materialType, date, technicianName, items } = req.body;

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

router.put('/material-logs/:id', authenticateToken, isAdminOrSuperAdmin, validate(materialLogUpdateSchema), async (req, res) => {
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

router.delete('/material-logs/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM material_logs WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting material log:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
