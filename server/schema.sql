-- CoreInventory Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  role VARCHAR(50) NOT NULL DEFAULT 'Inventory Manager',
  otp_code VARCHAR(6),
  otp_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  address TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Locations within warehouses
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  uom VARCHAR(20) NOT NULL DEFAULT 'pcs',
  reorder_point INTEGER DEFAULT 0,
  reorder_qty INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock per product per location
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(product_id, location_id)
);

-- Receipts (incoming goods)
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(20) UNIQUE NOT NULL,
  supplier VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_lines (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id),
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Deliveries (outgoing goods)
CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(20) UNIQUE NOT NULL,
  customer VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_lines (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id),
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Internal transfers
CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(20) UNIQUE NOT NULL,
  from_location_id INTEGER REFERENCES locations(id),
  to_location_id INTEGER REFERENCES locations(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER REFERENCES transfers(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Stock adjustments
CREATE TABLE IF NOT EXISTS adjustments (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(20) UNIQUE NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id),
  recorded_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unified stock move ledger
CREATE TABLE IF NOT EXISTS stock_moves (
  id SERIAL PRIMARY KEY,
  move_type VARCHAR(20) NOT NULL, -- Receipt, Delivery, Transfer, Adjustment
  reference_id INTEGER NOT NULL,
  reference_code VARCHAR(20) NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  from_location VARCHAR(255) DEFAULT '',
  to_location VARCHAR(255) DEFAULT '',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sequence counters
CREATE TABLE IF NOT EXISTS sequences (
  name VARCHAR(50) PRIMARY KEY,
  next_val INTEGER NOT NULL DEFAULT 1
);

-- Initialise sequence counters
INSERT INTO sequences (name, next_val) VALUES
  ('REC', 1), ('DEL', 1), ('TRF', 1), ('ADJ', 1), ('MOV', 1)
ON CONFLICT (name) DO NOTHING;

-- Seed default data
INSERT INTO warehouses (name, code, address) VALUES
  ('Main Warehouse', 'WH-01', '123 Industrial Ave'),
  ('Warehouse 2', 'WH-02', '456 Commerce Blvd'),
  ('Production Floor', 'PF-01', '123 Industrial Ave, Building B')
ON CONFLICT (code) DO NOTHING;

INSERT INTO locations (warehouse_id, name) VALUES
  (1, 'Rack A'), (1, 'Rack B'), (1, 'Rack C'), (1, 'Receiving Dock'),
  (2, 'Shelf 1'), (2, 'Shelf 2'), (2, 'Shelf 3'),
  (3, 'Assembly Line'), (3, 'Staging Area')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name) VALUES
  ('Raw Materials'), ('Furniture'), ('Electrical'), ('Packaging'), ('Tools')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, sku, category_id, uom, reorder_point, reorder_qty) VALUES
  ('Steel Rods', 'STL-001', 1, 'kg', 50, 200),
  ('Office Chairs', 'FUR-012', 2, 'pcs', 5, 20),
  ('Copper Wire', 'ELC-045', 3, 'm', 100, 500),
  ('Aluminum Sheets', 'STL-022', 1, 'sheets', 20, 100),
  ('Desk Lamps', 'FUR-055', 2, 'pcs', 10, 50),
  ('Steel Plates', 'STL-003', 1, 'kg', 30, 150),
  ('Packing Tape', 'PKG-001', 4, 'rolls', 50, 200),
  ('Safety Gloves', 'TLS-010', 5, 'pairs', 25, 100)
ON CONFLICT (sku) DO NOTHING;

-- Seed initial stock
INSERT INTO stock (product_id, location_id, quantity) VALUES
  (1, 1, 350), (1, 8, 100),
  (2, 5, 28),
  (3, 1, 3),
  (4, 1, 0),
  (5, 6, 120),
  (6, 8, 12),
  (7, 3, 85),
  (8, 2, 40)
ON CONFLICT (product_id, location_id) DO NOTHING;
