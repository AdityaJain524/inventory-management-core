import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// IMPORTANT: /all/locations must come BEFORE /:id/locations
// to prevent Express from matching "all" as an :id parameter

// List all locations (flat, for dropdowns)
router.get('/all/locations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, w.name as warehouse_name
      FROM locations l
      JOIN warehouses w ON w.id = l.warehouse_id
      ORDER BY w.name, l.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List warehouses with location counts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, COUNT(l.id) as location_count
      FROM warehouses w
      LEFT JOIN locations l ON l.warehouse_id = w.id
      GROUP BY w.id
      ORDER BY w.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create warehouse
router.post('/', async (req, res) => {
  try {
    const { name, code, address } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code required' });
    const result = await pool.query(
      'INSERT INTO warehouses (name, code, address) VALUES ($1,$2,$3) RETURNING *',
      [name, code, address || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List locations for a warehouse
router.get('/:id/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE warehouse_id = $1 ORDER BY name', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create location
router.post('/:id/locations', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query(
      'INSERT INTO locations (warehouse_id, name) VALUES ($1,$2) RETURNING *',
      [req.params.id, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
