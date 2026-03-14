import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// List stock moves with filters
router.get('/', async (req, res) => {
  try {
    const { type, product_id } = req.query;
    let sql = `
      SELECT sm.*, p.name as product_name, p.sku as product_sku
      FROM stock_moves sm
      LEFT JOIN products p ON p.id = sm.product_id
    `;
    const conditions = [];
    const params = [];

    if (type && type !== 'all') {
      params.push(type);
      conditions.push(`sm.move_type = $${params.length}`);
    }
    if (product_id) {
      params.push(product_id);
      conditions.push(`sm.product_id = $${params.length}`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY sm.created_at DESC LIMIT 100';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
