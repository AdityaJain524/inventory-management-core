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

// List receipts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*,
        json_agg(json_build_object(
          'id', rl.id, 'product_id', rl.product_id, 'product_name', p.name,
          'product_sku', p.sku, 'location_id', rl.location_id, 'location_name', l.name,
          'quantity', rl.quantity
        )) FILTER (WHERE rl.id IS NOT NULL) as lines
      FROM receipts r
      LEFT JOIN receipt_lines rl ON rl.receipt_id = r.id
      LEFT JOIN products p ON p.id = rl.product_id
      LEFT JOIN locations l ON l.id = rl.location_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create receipt
router.post('/', async (req, res) => {
  try {
    const { supplier, lines } = req.body;
    const reference = await nextRef('REC');

    const receipt = await pool.query(
      'INSERT INTO receipts (reference, supplier, status, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [reference, supplier || '', 'Draft', req.user?.id || null]
    );
    const receiptId = receipt.rows[0].id;

    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query(
          'INSERT INTO receipt_lines (receipt_id, product_id, location_id, quantity) VALUES ($1,$2,$3,$4)',
          [receiptId, line.product_id, line.location_id || null, line.quantity]
        );
      }
    }

    res.json(receipt.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate receipt → stock increases
router.put('/:id/validate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if (r.rows[0].status === 'Done') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Already validated' }); }

    const lines = await client.query('SELECT rl.*, p.name as product_name, l.name as location_name FROM receipt_lines rl JOIN products p ON p.id = rl.product_id LEFT JOIN locations l ON l.id = rl.location_id WHERE rl.receipt_id = $1', [req.params.id]);

    for (const line of lines.rows) {
      if (!line.location_id) continue;
      // Increase stock
      await client.query(
        'INSERT INTO stock (product_id, location_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock.quantity + $3',
        [line.product_id, line.location_id, line.quantity]
      );
      // Log stock move
      const moveRef = await nextRef('MOV');
      await client.query(
        'INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
        ['Receipt', r.rows[0].id, r.rows[0].reference, line.product_id, 'Vendor: ' + r.rows[0].supplier, line.location_name || 'Unknown', line.quantity]
      );
    }

    await client.query('UPDATE receipts SET status = $1 WHERE id = $2', ['Done', req.params.id]);
    await client.query('COMMIT');

    res.json({ message: 'Receipt validated', status: 'Done' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
