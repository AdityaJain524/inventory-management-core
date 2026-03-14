import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// KPIs
router.get('/kpis', async (req, res) => {
  try {
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products');
    
    const lowStock = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as count FROM products p
      LEFT JOIN (SELECT product_id, SUM(quantity) as total FROM stock GROUP BY product_id) s ON s.product_id = p.id
      WHERE COALESCE(s.total, 0) <= p.reorder_point AND p.reorder_point > 0
    `);

    const outOfStock = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as count FROM products p
      LEFT JOIN (SELECT product_id, SUM(quantity) as total FROM stock GROUP BY product_id) s ON s.product_id = p.id
      WHERE COALESCE(s.total, 0) = 0
    `);

    const pendingReceipts = await pool.query("SELECT COUNT(*) as count FROM receipts WHERE status IN ('Draft','Waiting','Ready')");
    const pendingDeliveries = await pool.query("SELECT COUNT(*) as count FROM deliveries WHERE status IN ('Draft','Waiting','Ready')");
    const pendingTransfers = await pool.query("SELECT COUNT(*) as count FROM transfers WHERE status IN ('Draft','Waiting','Ready')");

    res.json({
      total_products: parseInt(totalProducts.rows[0].count),
      low_stock: parseInt(lowStock.rows[0].count),
      out_of_stock: parseInt(outOfStock.rows[0].count),
      pending_receipts: parseInt(pendingReceipts.rows[0].count),
      pending_deliveries: parseInt(pendingDeliveries.rows[0].count),
      pending_transfers: parseInt(pendingTransfers.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recent operations (combined feed)
router.get('/recent-operations', async (req, res) => {
  try {
    const { type, status } = req.query;
    let queries = [];
    const baseConditions = [];

    if (!type || type === 'all' || type === 'Receipt') {
      queries.push(`
        SELECT reference as id, 'Receipt' as type, supplier as party,
          (SELECT string_agg(p.name, ', ') FROM receipt_lines rl JOIN products p ON p.id = rl.product_id WHERE rl.receipt_id = r.id) as product,
          (SELECT COALESCE(SUM(rl.quantity), 0) FROM receipt_lines rl WHERE rl.receipt_id = r.id) as qty,
          status, created_at as date
        FROM receipts r ${status && status !== 'all' ? `WHERE status = '${status}'` : ''}
      `);
    }
    if (!type || type === 'all' || type === 'Delivery') {
      queries.push(`
        SELECT reference as id, 'Delivery' as type, customer as party,
          (SELECT string_agg(p.name, ', ') FROM delivery_lines dl JOIN products p ON p.id = dl.product_id WHERE dl.delivery_id = d.id) as product,
          -(SELECT COALESCE(SUM(dl.quantity), 0) FROM delivery_lines dl WHERE dl.delivery_id = d.id) as qty,
          status, created_at as date
        FROM deliveries d ${status && status !== 'all' ? `WHERE status = '${status}'` : ''}
      `);
    }
    if (!type || type === 'all' || type === 'Transfer') {
      queries.push(`
        SELECT reference as id, 'Transfer' as type, '' as party,
          (SELECT string_agg(p.name, ', ') FROM transfer_lines tl2 JOIN products p ON p.id = tl2.product_id WHERE tl2.transfer_id = t.id) as product,
          (SELECT COALESCE(SUM(tl2.quantity), 0) FROM transfer_lines tl2 WHERE tl2.transfer_id = t.id) as qty,
          status, created_at as date
        FROM transfers t ${status && status !== 'all' ? `WHERE status = '${status}'` : ''}
      `);
    }
    if (!type || type === 'all' || type === 'Adjustment') {
      queries.push(`
        SELECT reference as id, 'Adjustment' as type, '' as party,
          p.name as product,
          (a.counted_qty - a.recorded_qty) as qty,
          a.status, a.created_at as date
        FROM adjustments a LEFT JOIN products p ON p.id = a.product_id
        ${status && status !== 'all' ? `WHERE a.status = '${status}'` : ''}
      `);
    }

    if (queries.length === 0) return res.json([]);

    const sql = queries.join(' UNION ALL ') + ' ORDER BY date DESC LIMIT 50';
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Low stock products
router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name, COALESCE(s.total, 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (SELECT product_id, SUM(quantity) as total FROM stock GROUP BY product_id) s ON s.product_id = p.id
      WHERE COALESCE(s.total, 0) <= p.reorder_point AND p.reorder_point > 0
      ORDER BY COALESCE(s.total, 0) ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
