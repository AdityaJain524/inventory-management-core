import 'dotenv/config';
import pool from './db.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing operational data (preserve users, schema tables)
    await client.query('DELETE FROM stock_moves');
    await client.query('DELETE FROM receipt_lines');
    await client.query('DELETE FROM delivery_lines');
    await client.query('DELETE FROM transfer_lines');
    await client.query('DELETE FROM receipts');
    await client.query('DELETE FROM deliveries');
    await client.query('DELETE FROM transfers');
    await client.query('DELETE FROM adjustments');
    await client.query('DELETE FROM stock');

    // Get location IDs
    const locs = await client.query('SELECT l.id, l.name, w.name as wh FROM locations l JOIN warehouses w ON w.id = l.warehouse_id ORDER BY l.id');
    const locMap = {};
    locs.rows.forEach(l => { locMap[`${l.wh}/${l.name}`] = l.id; });

    // Get product IDs
    const prods = await client.query('SELECT id, sku FROM products ORDER BY id');
    const prodMap = {};
    prods.rows.forEach(p => { prodMap[p.sku] = p.id; });

    console.log(`Found ${Object.keys(locMap).length} locations, ${Object.keys(prodMap).length} products`);

    // === INITIAL STOCK (base levels before operations) ===
    const initialStock = [
      { sku: 'STL-001', loc: 'Main Warehouse/Rack A', qty: 350 },
      { sku: 'STL-001', loc: 'Production Floor/Assembly Line', qty: 100 },
      { sku: 'FUR-012', loc: 'Warehouse 2/Shelf 1', qty: 28 },
      { sku: 'ELC-045', loc: 'Main Warehouse/Rack C', qty: 3 },
      { sku: 'FUR-055', loc: 'Warehouse 2/Shelf 1', qty: 120 },
      { sku: 'STL-003', loc: 'Production Floor/Assembly Line', qty: 12 },
      { sku: 'PKG-001', loc: 'Main Warehouse/Rack C', qty: 85 },
      { sku: 'TLS-010', loc: 'Main Warehouse/Rack B', qty: 40 },
      { sku: 'STL-022', loc: 'Main Warehouse/Rack A', qty: 0 },
    ];

    for (const s of initialStock) {
      const prodId = prodMap[s.sku];
      const locId = locMap[s.loc];
      if (prodId && locId) {
        await client.query(
          'INSERT INTO stock (product_id, location_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = $3',
          [prodId, locId, s.qty]
        );
      }
    }

    // Helper to add stock
    async function addStock(sku, loc, qty) {
      const pid = prodMap[sku], lid = locMap[loc];
      if (!pid || !lid) return;
      await client.query(
        'INSERT INTO stock (product_id, location_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock.quantity + $3',
        [pid, lid, qty]
      );
    }

    // Helper to subtract stock
    async function subStock(sku, loc, qty) {
      const pid = prodMap[sku], lid = locMap[loc];
      if (!pid || !lid) return;
      await client.query(
        'UPDATE stock SET quantity = GREATEST(quantity - $1, 0) WHERE product_id = $2 AND location_id = $3',
        [qty, pid, lid]
      );
    }

    // === RECEIPTS (5 total) ===
    const receipts = [
      { supplier: 'Steel Corp International', status: 'Done', daysAgo: 10, lines: [
        { sku: 'STL-001', qty: 200, loc: 'Main Warehouse/Rack A' },
        { sku: 'STL-003', qty: 75, loc: 'Main Warehouse/Rack B' },
      ]},
      { supplier: 'ElectroParts Ltd', status: 'Done', daysAgo: 8, lines: [
        { sku: 'ELC-045', qty: 500, loc: 'Main Warehouse/Rack C' },
        { sku: 'FUR-055', qty: 30, loc: 'Warehouse 2/Shelf 1' },
      ]},
      { supplier: 'Premium Metals Inc', status: 'Done', daysAgo: 5, lines: [
        { sku: 'STL-022', qty: 150, loc: 'Main Warehouse/Rack A' },
      ]},
      { supplier: 'SafetyFirst Supplies', status: 'Ready', daysAgo: 2, lines: [
        { sku: 'TLS-010', qty: 200, loc: 'Warehouse 2/Shelf 2' },
        { sku: 'PKG-001', qty: 300, loc: 'Warehouse 2/Shelf 3' },
      ]},
      { supplier: 'Office World', status: 'Draft', daysAgo: 1, lines: [
        { sku: 'FUR-012', qty: 15, loc: 'Warehouse 2/Shelf 1' },
      ]},
    ];

    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      const ref = `REC-${String(i + 1).padStart(3, '0')}`;
      const res = await client.query(
        "INSERT INTO receipts (reference, supplier, status, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day' * $4) RETURNING id",
        [ref, r.supplier, r.status, r.daysAgo]
      );
      const recId = res.rows[0].id;
      for (const line of r.lines) {
        const prodId = prodMap[line.sku], locId = locMap[line.loc];
        if (!prodId || !locId) continue;
        await client.query(
          'INSERT INTO receipt_lines (receipt_id, product_id, location_id, quantity) VALUES ($1,$2,$3,$4)',
          [recId, prodId, locId, line.qty]
        );
        if (r.status === 'Done') {
          await addStock(line.sku, line.loc, line.qty);
          await client.query(
            "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ('Receipt', $1, $2, $3, 'Supplier', $4, $5, NOW() - INTERVAL '1 day' * $6)",
            [recId, ref, prodId, line.loc, line.qty, r.daysAgo]
          );
        }
      }
    }

    // === DELIVERIES (4 total) ===
    const deliveries = [
      { customer: 'BuildRight Construction', status: 'Done', daysAgo: 7, lines: [
        { sku: 'STL-001', qty: 100, loc: 'Main Warehouse/Rack A' },
        { sku: 'STL-003', qty: 25, loc: 'Main Warehouse/Rack B' },
      ]},
      { customer: 'HomeStyle Furniture Co', status: 'Done', daysAgo: 4, lines: [
        { sku: 'FUR-012', qty: 5, loc: 'Warehouse 2/Shelf 1' },
        { sku: 'FUR-055', qty: 10, loc: 'Warehouse 2/Shelf 1' },
      ]},
      { customer: 'TechBuild Solutions', status: 'Waiting', daysAgo: 2, lines: [
        { sku: 'ELC-045', qty: 150, loc: 'Main Warehouse/Rack C' },
      ]},
      { customer: 'Metro Packaging Group', status: 'Draft', daysAgo: 1, lines: [
        { sku: 'PKG-001', qty: 50, loc: 'Main Warehouse/Rack C' },
      ]},
    ];

    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      const ref = `DEL-${String(i + 1).padStart(3, '0')}`;
      const res = await client.query(
        "INSERT INTO deliveries (reference, customer, status, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day' * $4) RETURNING id",
        [ref, d.customer, d.status, d.daysAgo]
      );
      const delId = res.rows[0].id;
      for (const line of d.lines) {
        const prodId = prodMap[line.sku], locId = locMap[line.loc];
        if (!prodId || !locId) continue;
        await client.query(
          'INSERT INTO delivery_lines (delivery_id, product_id, location_id, quantity) VALUES ($1,$2,$3,$4)',
          [delId, prodId, locId, line.qty]
        );
        if (d.status === 'Done') {
          await subStock(line.sku, line.loc, line.qty);
          await client.query(
            "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ('Delivery', $1, $2, $3, $4, 'Customer', $5, NOW() - INTERVAL '1 day' * $6)",
            [delId, ref, prodId, line.loc, -line.qty, d.daysAgo]
          );
        }
      }
    }

    // === TRANSFERS (2 total) ===
    const transfers = [
      { from: 'Main Warehouse/Rack A', to: 'Production Floor/Assembly Line', status: 'Done', daysAgo: 6, lines: [
        { sku: 'STL-001', qty: 50 },
        { sku: 'STL-022', qty: 20 },
      ]},
      { from: 'Warehouse 2/Shelf 1', to: 'Main Warehouse/Rack B', status: 'Draft', daysAgo: 1, lines: [
        { sku: 'FUR-055', qty: 15 },
      ]},
    ];

    for (let i = 0; i < transfers.length; i++) {
      const t = transfers[i];
      const ref = `TRF-${String(i + 1).padStart(3, '0')}`;
      const fromLocId = locMap[t.from], toLocId = locMap[t.to];
      if (!fromLocId || !toLocId) continue;
      const res = await client.query(
        "INSERT INTO transfers (reference, from_location_id, to_location_id, status, created_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day' * $5) RETURNING id",
        [ref, fromLocId, toLocId, t.status, t.daysAgo]
      );
      const trfId = res.rows[0].id;
      for (const line of t.lines) {
        const prodId = prodMap[line.sku];
        if (!prodId) continue;
        await client.query(
          'INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES ($1,$2,$3)',
          [trfId, prodId, line.qty]
        );
        if (t.status === 'Done') {
          await subStock(line.sku, t.from, line.qty);
          await addStock(line.sku, t.to, line.qty);
          await client.query(
            "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ('Transfer', $1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 day' * $7)",
            [trfId, ref, prodId, t.from, t.to, line.qty, t.daysAgo]
          );
        }
      }
    }

    // === ADJUSTMENTS (2 total) ===
    const adjustments = [
      { sku: 'STL-001', loc: 'Main Warehouse/Rack A', counted: 395, daysAgo: 3 },
      { sku: 'ELC-045', loc: 'Main Warehouse/Rack C', counted: 350, daysAgo: 1 },
    ];

    for (let i = 0; i < adjustments.length; i++) {
      const a = adjustments[i];
      const ref = `ADJ-${String(i + 1).padStart(3, '0')}`;
      const prodId = prodMap[a.sku], locId = locMap[a.loc];
      if (!prodId || !locId) continue;
      const stockRes = await client.query(
        'SELECT COALESCE(quantity, 0) as qty FROM stock WHERE product_id = $1 AND location_id = $2',
        [prodId, locId]
      );
      const recorded = stockRes.rows.length > 0 ? parseFloat(stockRes.rows[0].qty) : 0;
      const diff = a.counted - recorded;

      const res = await client.query(
        "INSERT INTO adjustments (reference, product_id, location_id, recorded_qty, counted_qty, status, created_at) VALUES ($1,$2,$3,$4,$5,'Done', NOW() - INTERVAL '1 day' * $6) RETURNING id",
        [ref, prodId, locId, recorded, a.counted, a.daysAgo]
      );
      // Apply adjustment
      await client.query(
        'UPDATE stock SET quantity = $1 WHERE product_id = $2 AND location_id = $3',
        [a.counted, prodId, locId]
      );
      await client.query(
        "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ('Adjustment', $1, $2, $3, $4, $4, $5, NOW() - INTERVAL '1 day' * $6)",
        [res.rows[0].id, ref, prodId, a.loc, diff, a.daysAgo]
      );
    }

    // Update sequence counters to avoid conflicts with future creates
    await client.query("UPDATE sequences SET next_val = 6 WHERE name = 'REC'");
    await client.query("UPDATE sequences SET next_val = 5 WHERE name = 'DEL'");
    await client.query("UPDATE sequences SET next_val = 3 WHERE name = 'TRF'");
    await client.query("UPDATE sequences SET next_val = 3 WHERE name = 'ADJ'");

    await client.query('COMMIT');
    console.log('');
    console.log('✅ Seed data inserted successfully!');
    console.log('   📦 5 receipts (3 Done, 1 Ready, 1 Draft)');
    console.log('   🚚 4 deliveries (2 Done, 1 Waiting, 1 Draft)');
    console.log('   🔄 2 transfers (1 Done, 1 Draft)');
    console.log('   📋 2 adjustments (Done)');
    console.log('   📊 Stock moves logged for all completed operations');
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
