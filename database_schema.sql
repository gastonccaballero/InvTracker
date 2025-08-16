-- Inventory & Events Management Database Schema
-- PostgreSQL Database for InvTracker Application

-- Create database (run this separately if needed)
-- CREATE DATABASE invtracker;

-- Connect to the database
-- \c invtracker;

-- Settings table for business configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    currency_symbol VARCHAR(10) DEFAULT '$',
    tax_rate DECIMAL(5,3) DEFAULT 0,
    business_name VARCHAR(255) DEFAULT 'Your Company',
    business_address TEXT,
    business_phone VARCHAR(50),
    business_email VARCHAR(255),
    business_logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    location VARCHAR(100),
    unit VARCHAR(50),
    safety_stock INTEGER DEFAULT 0,
    qty_total INTEGER DEFAULT 0,
    qty_available INTEGER DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    tags TEXT[], -- Array of tags
    notes TEXT,
    image_path TEXT, -- Path to uploaded image
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration-safe addition of image_path column
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255),
    date DATE,
    location VARCHAR(255),
    contact VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    discount_type VARCHAR(20) DEFAULT 'none', -- none | percent | amount
    discount_value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration-safe alterations for existing databases
-- Ensure new checkout columns exist even if table was created previously
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS discount_customer DECIMAL(10,2) DEFAULT 0;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS discount_manual DECIMAL(10,2) DEFAULT 0;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Ensure image_path column exists for inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Add foreign key constraint for customer_id if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_checkouts_customer'
  ) THEN
    ALTER TABLE checkouts
      ADD CONSTRAINT fk_checkouts_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Checkouts table (main checkout records)
CREATE TABLE IF NOT EXISTS checkouts (
    id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(id) ON DELETE SET NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_customer DECIMAL(10,2) DEFAULT 0,
    discount_manual DECIMAL(10,2) DEFAULT 0,
    discount_total DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    returned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checkout items (line items in a checkout)
CREATE TABLE IF NOT EXISTS checkout_items (
    id SERIAL PRIMARY KEY,
    checkout_id VARCHAR(50) REFERENCES checkouts(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES inventory(id) ON DELETE SET NULL,
    sku VARCHAR(100),
    name VARCHAR(255),
    qty INTEGER NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Returns table (tracking returned items)
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    checkout_id VARCHAR(50) REFERENCES checkouts(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES inventory(id) ON DELETE SET NULL,
    qty INTEGER NOT NULL,
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL,
    ref VARCHAR(255),
    details TEXT
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(qty_available);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_checkouts_customer ON checkouts(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_event ON checkouts(event_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_date ON checkouts(date);
CREATE INDEX IF NOT EXISTS idx_checkout_items_checkout ON checkout_items(checkout_id);
CREATE INDEX IF NOT EXISTS idx_checkout_items_item ON checkout_items(item_id);
CREATE INDEX IF NOT EXISTS idx_returns_checkout ON returns(checkout_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity(date);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity(type);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_updated_at') THEN
    CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
    CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_checkouts_updated_at') THEN
    CREATE TRIGGER update_checkouts_updated_at BEFORE UPDATE ON checkouts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to update inventory available quantity when items are checked out
CREATE OR REPLACE FUNCTION update_inventory_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease available quantity when item is added to checkout
    UPDATE inventory 
    SET qty_available = qty_available - NEW.qty,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update inventory available quantity when items are returned
CREATE OR REPLACE FUNCTION update_inventory_on_return()
RETURNS TRIGGER AS $$
BEGIN
    -- Increase available quantity when item is returned
    UPDATE inventory 
    SET qty_available = qty_available + NEW.qty,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for inventory updates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_inventory_checkout') THEN
    CREATE TRIGGER trigger_inventory_checkout AFTER INSERT ON checkout_items
      FOR EACH ROW EXECUTE FUNCTION update_inventory_on_checkout();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_inventory_return') THEN
    CREATE TRIGGER trigger_inventory_return AFTER INSERT ON returns
      FOR EACH ROW EXECUTE FUNCTION update_inventory_on_return();
  END IF;
END $$;

-- Insert default settings
INSERT INTO settings (id, currency_symbol, tax_rate, business_name, business_address, business_phone, business_email, business_logo)
VALUES (1, '$', 0, 'Your Company', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Sample data for testing (optional)
-- You can uncomment these lines to add sample data

/*
-- Sample inventory items
INSERT INTO inventory (id, sku, name, category, location, unit, qty_total, qty_available, safety_stock, cost, price, tags, notes) VALUES
('demo1', 'UPL-LED-01', 'LED Uplight', 'Lighting', 'Rack A1', 'pcs', 30, 30, 6, 45.00, 20.00, ARRAY['rental', 'indoor'], 'RGBA'),
('demo2', 'SPK-12A', '12" Active Speaker', 'Audio', 'Rack B2', 'pcs', 12, 12, 2, 210.00, 55.00, ARRAY['rental'], ''),
('demo3', 'CAB-XLR25', 'XLR Cable 25ft', 'Cables', 'Bin C4', 'pcs', 50, 50, 10, 7.00, 4.00, ARRAY['consumable'], ''),
('demo4', 'TRS-PLAT', 'Truss Platform', 'Staging', 'Yard', 'pcs', 8, 8, 1, 150.00, 40.00, ARRAY['outdoor'], '');

-- Sample events
INSERT INTO events (id, name, client, date, location, contact, notes, status) VALUES
('evt1', 'Summer Gala', 'Acme Co.', CURRENT_DATE, 'City Hall', 'jane@acme.com', 'Setup 2pm', 'planned'),
('evt2', 'Tech Expo', 'Beta Labs', CURRENT_DATE + INTERVAL '7 days', 'Convention Center', 'ops@betalabs.test', 'Need 4x speakers', 'planned');
*/
