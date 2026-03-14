import { Router } from 'express';
import pool from '../db.js';

const router = Router();

async function nextRef(prefix) {
  const r = await pool.query(
    'UPDATE sequences SET next_val = next_val + 1 WHERE name = $1 RETURNING next_val - 1 as val',
    [prefix]
  );
  return `${prefix}-${String(r.rows[0].val).padStart(3, '0')}`;
}

// List adjustments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, p.name as product_name, p.sku as product_sku,
        l.name as location_name, w.name as warehouse_name
      FROM adjustments a
      LEFT JOIN products p ON p.id = a.product_id
      LEFT JOIN locations l ON l.id = a.location_id
      LEFT JOIN warehouses w ON w.id = l.warehouse_id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create adjustment
router.post('/', async (req, res) => {
  try {
    const { product_id, location_id, counted_qty } = req.body;
    if (!product_id || !location_id) return res.status(400).json({ error: 'Product and location required' });

    // Get current recorded stock
    const stockResult = await pool.query('SELECT quantity FROM stock WHERE product_id = $1 AND location_id = $2', [product_id, location_id]);
    const recorded_qty = stockResult.rows.length > 0 ? parseFloat(stockResult.rows[0].quantity) : 0;

    const reference = await nextRef('ADJ');
    const result = await pool.query(
      'INSERT INTO adjustments (reference, product_id, location_id, recorded_qty, counted_qty, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [reference, product_id, location_id, recorded_qty, counted_qty, 'Draft', req.user?.id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate adjustment → update stock
router.put('/:id/validate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const a = await client.query('SELECT a.*, p.name as product_name, l.name as location_name FROM adjustments a JOIN products p ON p.id = a.product_id LEFT JOIN locations l ON l.id = a.location_id WHERE a.id = $1', [req.params.id]);
    if (a.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if (a.rows[0].status === 'Done') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Already validated' }); }

    const adj = a.rows[0];
    const diff = parseFloat(adj.counted_qty) - parseFloat(adj.recorded_qty);

    // Set stock to counted quantity
    await client.query(
      'INSERT INTO stock (product_id, location_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = $3',
      [adj.product_id, adj.location_id, adj.counted_qty]
    );

    // Log move
    await client.query(
      'INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
      ['Adjustment', adj.id, adj.reference, adj.product_id, adj.location_name || 'Unknown', '—', diff]
    );

    await client.query('UPDATE adjustments SET status = $1 WHERE id = $2', ['Done', req.params.id]);
    await client.query('COMMIT');

    res.json({ message: 'Adjustment validated', status: 'Done' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
