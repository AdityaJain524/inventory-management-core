import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Helper: get next sequence value
async function nextRef(prefix) {
  const r = await pool.query(
    'UPDATE sequences SET next_val = next_val + 1 WHERE name = $1 RETURNING next_val - 1 as val',
    [prefix]
  );
  const num = r.rows[0].val;
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

// List products with search, category filter, stock totals
router.get('/', async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
    `;
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY p.id, c.name ORDER BY p.name';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { name, sku, category_id, uom, initial_stock, location_id, reorder_point, reorder_qty } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });

    const result = await pool.query(
      'INSERT INTO products (name, sku, category_id, uom, reorder_point, reorder_qty) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, sku, category_id || null, uom || 'pcs', reorder_point || 0, reorder_qty || 0]
    );
    const product = result.rows[0];

    // Set initial stock if provided
    if (initial_stock && initial_stock > 0 && location_id) {
      await pool.query(
        'INSERT INTO stock (product_id, location_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock.quantity + $3',
        [product.id, location_id, initial_stock]
      );
    }

    res.json(product);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, category_id, uom, reorder_point, reorder_qty } = req.body;
    const result = await pool.query(
      'UPDATE products SET name=COALESCE($1,name), sku=COALESCE($2,sku), category_id=COALESCE($3,category_id), uom=COALESCE($4,uom), reorder_point=COALESCE($5,reorder_point), reorder_qty=COALESCE($6,reorder_qty) WHERE id=$7 RETURNING *',
      [name, sku, category_id, uom, reorder_point, reorder_qty, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Categories ---
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Reorder rules ---
router.get('/reorder-rules', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.reorder_point > 0
      GROUP BY p.id, c.name
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/reorder', async (req, res) => {
  try {
    const { reorder_point, reorder_qty } = req.body;
    const result = await pool.query(
      'UPDATE products SET reorder_point = $1, reorder_qty = $2 WHERE id = $3 RETURNING *',
      [reorder_point || 0, reorder_qty || 0, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stock per product per location
router.get('/:id/stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, l.name as location_name, w.name as warehouse_name
      FROM stock s
      JOIN locations l ON l.id = s.location_id
      JOIN warehouses w ON w.id = l.warehouse_id
      WHERE s.product_id = $1
      ORDER BY w.name, l.name
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
