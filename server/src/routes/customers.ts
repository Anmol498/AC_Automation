import express from 'express';
import pool from '../config/db.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { customerSchema } from '../schemas/customer.js';
import { authenticateToken, isAdminOrSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, upload.fields([{ name: 'drawing' }, { name: 'quotation' }]), validate(customerSchema), async (req: any, res) => {
  const { name, email, phone, address } = req.body;
  const drawingUrl = req.files && req.files['drawing'] ? `/uploads/${req.files['drawing'][0].filename}` : null;
  const quotationUrl = req.files && req.files['quotation'] ? `/uploads/${req.files['quotation'][0].filename}` : null;

  try {
    const [result]: any = await pool.execute(
      'INSERT INTO customers (name, email, phone, address, drawing_url, quotation_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email || null, phone || null, address || null, drawingUrl, quotationUrl]
    );
    res.json({ id: result.insertId, name, email: email || null, phone: phone || null, address: address || null, drawingUrl, quotationUrl, createdAt: new Date() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, upload.fields([{ name: 'drawing' }, { name: 'quotation' }]), validate(customerSchema), async (req: any, res) => {
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
    const [rows]: any = await pool.execute('SELECT id, name, email, phone, address, drawing_url AS drawingUrl, quotation_url AS quotationUrl, created_at AS createdAt FROM customers WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, isAdminOrSuperAdmin, async (req, res) => {
  try {
    await pool.execute('UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
