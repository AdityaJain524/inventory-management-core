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

// List deliveries
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
        json_agg(json_build_object(
          'id', dl.id, 'product_id', dl.product_id, 'product_name', p.name,
          'product_sku', p.sku, 'location_id', dl.location_id, 'location_name', l.name,
          'quantity', dl.quantity
        )) FILTER (WHERE dl.id IS NOT NULL) as lines
      FROM deliveries d
      LEFT JOIN delivery_lines dl ON dl.delivery_id = d.id
      LEFT JOIN products p ON p.id = dl.product_id
      LEFT JOIN locations l ON l.id = dl.location_id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create delivery
router.post('/', async (req, res) => {
  try {
    const { customer, lines } = req.body;
    const reference = await nextRef('DEL');

    const delivery = await pool.query(
      'INSERT INTO deliveries (reference, customer, status, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [reference, customer || '', 'Draft', req.user?.id || null]
    );
    const deliveryId = delivery.rows[0].id;

    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query(
          'INSERT INTO delivery_lines (delivery_id, product_id, location_id, quantity) VALUES ($1,$2,$3,$4)',
          [deliveryId, line.product_id, line.location_id || null, line.quantity]
        );
      }
    }

    res.json(delivery.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate delivery → stock decreases
router.put('/:id/validate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const d = await client.query('SELECT * FROM deliveries WHERE id = $1', [req.params.id]);
    if (d.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if (d.rows[0].status === 'Done') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Already validated' }); }

    const lines = await client.query('SELECT dl.*, p.name as product_name, l.name as location_name FROM delivery_lines dl JOIN products p ON p.id = dl.product_id LEFT JOIN locations l ON l.id = dl.location_id WHERE dl.delivery_id = $1', [req.params.id]);

    for (const line of lines.rows) {
      if (!line.location_id) continue;
      
      // Decrease stock (allow negative)
      await client.query(
        `INSERT INTO stock (product_id, location_id, quantity) 
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, location_id) 
         DO UPDATE SET quantity = stock.quantity + $3`,
        [line.product_id, line.location_id, -parseFloat(line.quantity)]
      );

      // Log stock move
      await client.query(
        'INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
        ['Delivery', d.rows[0].id, d.rows[0].reference, line.product_id, line.location_name || 'Unknown', 'Customer: ' + d.rows[0].customer, -line.quantity]
      );
    }

    await client.query('UPDATE deliveries SET status = $1 WHERE id = $2', ['Done', req.params.id]);
    await client.query('COMMIT');

    res.json({ message: 'Delivery validated', status: 'Done' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
