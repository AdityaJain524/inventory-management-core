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

// List transfers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        fl.name as from_location_name, fw.name as from_warehouse_name,
        tl.name as to_location_name, tw.name as to_warehouse_name,
        json_agg(json_build_object(
          'id', tl2.id, 'product_id', tl2.product_id, 'product_name', p.name,
          'product_sku', p.sku, 'quantity', tl2.quantity
        )) FILTER (WHERE tl2.id IS NOT NULL) as lines
      FROM transfers t
      LEFT JOIN locations fl ON fl.id = t.from_location_id
      LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
      LEFT JOIN locations tl ON tl.id = t.to_location_id
      LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
      LEFT JOIN transfer_lines tl2 ON tl2.transfer_id = t.id
      LEFT JOIN products p ON p.id = tl2.product_id
      GROUP BY t.id, fl.name, fw.name, tl.name, tw.name
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create transfer
router.post('/', async (req, res) => {
  try {
    const { from_location_id, to_location_id, lines } = req.body;
    if (!from_location_id || !to_location_id) return res.status(400).json({ error: 'From and to locations required' });

    const reference = await nextRef('TRF');
    const transfer = await pool.query(
      'INSERT INTO transfers (reference, from_location_id, to_location_id, status, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [reference, from_location_id, to_location_id, 'Draft', req.user?.id || null]
    );
    const transferId = transfer.rows[0].id;

    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query(
          'INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES ($1,$2,$3)',
          [transferId, line.product_id, line.quantity]
        );
      }
    }

    res.json(transfer.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate transfer → move stock from source to destination
router.put('/:id/validate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const t = await client.query('SELECT * FROM transfers WHERE id = $1', [req.params.id]);
    if (t.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    if (t.rows[0].status === 'Done') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Already validated' }); }

    const transfer = t.rows[0];
    const fromLoc = await client.query('SELECT l.name, w.name as wh_name FROM locations l JOIN warehouses w ON w.id = l.warehouse_id WHERE l.id=$1', [transfer.from_location_id]);
    const toLoc = await client.query('SELECT l.name, w.name as wh_name FROM locations l JOIN warehouses w ON w.id = l.warehouse_id WHERE l.id=$1', [transfer.to_location_id]);

    const lines = await client.query('SELECT tl.*, p.name as product_name FROM transfer_lines tl JOIN products p ON p.id = tl.product_id WHERE tl.transfer_id = $1', [req.params.id]);

    for (const line of lines.rows) {
      // Check source stock
      const stockResult = await client.query('SELECT quantity FROM stock WHERE product_id = $1 AND location_id = $2', [line.product_id, transfer.from_location_id]);
      const currentQty = stockResult.rows.length > 0 ? parseFloat(stockResult.rows[0].quantity) : 0;
      if (currentQty < parseFloat(line.quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for ${line.product_name} at source. Available: ${currentQty}` });
      }

      // Decrease from source
      await client.query(
        'UPDATE stock SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3',
        [line.quantity, line.product_id, transfer.from_location_id]
      );
      // Increase at destination
      await client.query(
        'INSERT INTO stock (product_id, location_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock.quantity + $3',
        [line.product_id, transfer.to_location_id, line.quantity]
      );

      // Log move
      const fromName = fromLoc.rows[0] ? `${fromLoc.rows[0].wh_name} / ${fromLoc.rows[0].name}` : 'Unknown';
      const toName = toLoc.rows[0] ? `${toLoc.rows[0].wh_name} / ${toLoc.rows[0].name}` : 'Unknown';
      await client.query(
        'INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
        ['Transfer', transfer.id, transfer.reference, line.product_id, fromName, toName, line.quantity]
      );
    }

    await client.query('UPDATE transfers SET status = $1 WHERE id = $2', ['Done', req.params.id]);
    await client.query('COMMIT');

    res.json({ message: 'Transfer validated', status: 'Done' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
