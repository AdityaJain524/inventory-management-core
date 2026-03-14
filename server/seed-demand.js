import pool from './db.js';

async function seedFullHistory() {
  console.log('🌱 Generating complete operational history (Deliveries, Transfers, Adjustments)...');
  
  try {
    // 1. Get required data
    const productsRes = await pool.query('SELECT id, name FROM products');
    const locationsRes = await pool.query('SELECT id, name FROM locations');
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    
    const products = productsRes.rows;
    const locations = locationsRes.rows;
    const userId = userRes.rows[0]?.id || null;

    if (products.length === 0 || locations.length < 2) {
      console.log('❌ Error: Need at least 1 product and 2 locations to seed history.');
      process.exit(1);
    }

    // 2. Clear old seeded data
    console.log('🧹 Cleaning old seeded records...');
    await pool.query("DELETE FROM stock_moves WHERE reference_code LIKE 'SEED-%'");
    await pool.query("DELETE FROM delivery_lines WHERE delivery_id IN (SELECT id FROM deliveries WHERE reference LIKE 'SDEL-%')");
    await pool.query("DELETE FROM deliveries WHERE reference LIKE 'SDEL-%'");
    await pool.query("DELETE FROM transfer_lines WHERE transfer_id IN (SELECT id FROM transfers WHERE reference LIKE 'STRF-%')");
    await pool.query("DELETE FROM transfers WHERE reference LIKE 'STRF-%'");
    await pool.query("DELETE FROM adjustments WHERE reference LIKE 'SADJ-%'");
    await pool.query("DELETE FROM receipt_lines WHERE receipt_id IN (SELECT id FROM receipts WHERE reference LIKE 'SREC-%')");
    await pool.query("DELETE FROM receipts WHERE reference LIKE 'SREC-%'");

    for (const product of products) {
      console.log(`📦 Seeding history for: ${product.name}`);
      
      // --- INITIAL RECEIPT (Stock In) ---
      const initialQty = Math.floor(Math.random() * 500) + 500;
      const recRef = `SREC-${product.id}-${Math.floor(Math.random() * 1000)}`;
      const recRes = await pool.query(
        "INSERT INTO receipts (reference, supplier, status, created_by, created_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '95 days') RETURNING id",
        [recRef, 'Global Seeding Corp', 'Validated', userId]
      );
      const recId = recRes.rows[0].id;
      await pool.query("INSERT INTO receipt_lines (receipt_id, product_id, location_id, quantity) VALUES ($1, $2, $3, $4)", [recId, product.id, locations[0].id, initialQty]);
      await pool.query(
        "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, to_location, quantity, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '95 days')",
        ['Receipt', recId, recRef, product.id, locations[0].name, initialQty]
      );

      // --- 90 DAYS OF ACTIVITY ---
      for (let i = 90; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // A. DAILY DELIVERIES (Demand) - 70% chance
        if (Math.random() < 0.7) {
          const qty = Math.floor(Math.random() * 15) + 5;
          const delRef = `SDEL-${product.id}-${i}`;
          const delRes = await pool.query(
            "INSERT INTO deliveries (reference, customer, status, created_by, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [delRef, 'Sample Customer', 'Validated', userId, date]
          );
          const delId = delRes.rows[0].id;
          await pool.query("INSERT INTO delivery_lines (delivery_id, product_id, location_id, quantity) VALUES ($1, $2, $3, $4)", [delId, product.id, locations[0].id, qty]);
          await pool.query(
            "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, quantity, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            ['Delivery', delId, delRef, product.id, locations[0].name, -qty, date]
          );
        }

        // B. TRANSFERS - 15% chance
        if (Math.random() < 0.15) {
          const qty = Math.floor(Math.random() * 20) + 10;
          const trfRef = `STRF-${product.id}-${i}`;
          const locFrom = locations[0];
          const locTo = locations[Math.floor(Math.random() * (locations.length - 1)) + 1];
          const trfRes = await pool.query(
            "INSERT INTO transfers (reference, from_location_id, to_location_id, status, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [trfRef, locFrom.id, locTo.id, 'Validated', userId, date]
          );
          const trfId = trfRes.rows[0].id;
          await pool.query("INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES ($1, $2, $3)", [trfId, product.id, qty]);
          await pool.query(
            "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, from_location, to_location, quantity, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            ['Transfer', trfId, trfRef, product.id, locFrom.name, locTo.name, qty, date]
          );
        }

        // C. ADJUSTMENTS - 5% chance
        if (Math.random() < 0.05) {
          const adjRef = `SADJ-${product.id}-${i}`;
          const diff = Math.random() > 0.5 ? 2 : -2; // Small discrepancy
          await pool.query(
            "INSERT INTO adjustments (reference, product_id, location_id, recorded_qty, counted_qty, status, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [adjRef, product.id, locations[0].id, 100, 100 + diff, 'Validated', userId, date]
          );
          await pool.query(
            "INSERT INTO stock_moves (move_type, reference_id, reference_code, product_id, to_location, quantity, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            ['Adjustment', 0, adjRef, product.id, locations[0].name, diff, date]
          );
        }
      }
    }

    console.log('✅ Success! Full operational history seeded.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

seedFullHistory();
