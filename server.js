const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'InvTracker',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
  }
});

// API Routes

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { currency_symbol, tax_rate, business_name, business_address, business_phone, business_email, business_logo } = req.body;
    const result = await pool.query(
      `UPDATE settings SET 
        currency_symbol = $1, 
        tax_rate = $2, 
        business_name = $3, 
        business_address = $4, 
        business_phone = $5, 
        business_email = $6, 
        business_logo = $7,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 1 RETURNING *`,
      [currency_symbol, tax_rate, business_name, business_address, business_phone, business_email, business_logo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { id, sku, name, category, location, unit, safety_stock, qty_total, qty_available, cost, price, tags, notes, image_path } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory (id, sku, name, category, location, unit, safety_stock, qty_total, qty_available, cost, price, tags, notes, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [id, sku, name, category, location, unit, safety_stock, qty_total, qty_available, cost, price, tags, notes, image_path]
    );
    
    // Log activity
    await pool.query(
      'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
      ['inventory.add', sku, `Added ${name}`]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, category, location, unit, safety_stock, qty_total, qty_available, cost, price, tags, notes, image_path } = req.body;
    
    const result = await pool.query(
      `UPDATE inventory SET 
        sku = $1, name = $2, category = $3, location = $4, unit = $5, 
        safety_stock = $6, qty_total = $7, qty_available = $8, cost = $9, 
        price = $10, tags = $11, notes = $12, image_path = $13, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 RETURNING *`,
      [sku, name, category, location, unit, safety_stock, qty_total, qty_available, cost, price, tags, notes, image_path, id]
    );
    
    // Log activity
    await pool.query(
      'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
      ['inventory.update', sku, `Updated ${name}`]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get item info before deletion for logging
    const itemResult = await pool.query('SELECT sku, name FROM inventory WHERE id = $1', [id]);
    const item = itemResult.rows[0];
    
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);
    
    if (item) {
      // Log activity
      await pool.query(
        'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
        ['inventory.delete', item.sku, `Deleted ${item.name}`]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Events
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY date DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { id, name, client, date, location, contact, notes, status } = req.body;
    const result = await pool.query(
      `INSERT INTO events (id, name, client, date, location, contact, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, name, client, date, location, contact, notes, status]
    );
    
    // Log activity
    await pool.query(
      'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
      ['event.add', name, 'Created event']
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, client, date, location, contact, notes, status } = req.body;
    
    const result = await pool.query(
      `UPDATE events SET 
        name = $1, client = $2, date = $3, location = $4, contact = $5, 
        notes = $6, status = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [name, client, date, location, contact, notes, status, id]
    );
    
    // Log activity
    await pool.query(
      'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
      ['event.update', name, 'Updated event']
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event info before deletion for logging
    const eventResult = await pool.query('SELECT name FROM events WHERE id = $1', [id]);
    const event = eventResult.rows[0];
    
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    
    if (event) {
      // Log activity
      await pool.query(
        'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
        ['event.delete', event.name, 'Deleted event']
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkouts
app.get('/api/checkouts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, e.name as event_name 
      FROM checkouts c 
      LEFT JOIN events e ON c.event_id = e.id 
      ORDER BY c.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkouts', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id, event_id, due_date, items, subtotal, tax, total } = req.body;
    
    // Create checkout
    const checkoutResult = await client.query(
      `INSERT INTO checkouts (id, event_id, due_date, subtotal, tax, total)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, event_id, due_date, subtotal, tax, total]
    );
    
    // Add checkout items
    for (const item of items) {
      await client.query(
        `INSERT INTO checkout_items (checkout_id, item_id, sku, name, qty, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, item.item_id, item.sku, item.name, item.qty, item.unit_price]
      );
    }
    
    // Get event name for logging
    const eventResult = await client.query('SELECT name FROM events WHERE id = $1', [event_id]);
    const eventName = eventResult.rows[0]?.name || 'Event';
    
    // Log activity
    await client.query(
      'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
      ['checkout', id, `${eventName} • ${items.length} item(s)`]
    );
    
    await client.query('COMMIT');
    res.json(checkoutResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/checkouts/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM checkout_items WHERE checkout_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkouts/:id/returns', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { returns } = req.body;
    
    // Process returns
    for (const ret of returns) {
      await client.query(
        `INSERT INTO returns (checkout_id, item_id, qty)
         VALUES ($1, $2, $3)`,
        [id, ret.item_id, ret.qty]
      );
    }
    
    // Check if all items are returned
    const checkoutItemsResult = await client.query(
      `SELECT ci.item_id, ci.qty, COALESCE(SUM(r.qty), 0) as returned_qty
       FROM checkout_items ci
       LEFT JOIN returns r ON ci.checkout_id = r.checkout_id AND ci.item_id = r.item_id
       WHERE ci.checkout_id = $1
       GROUP BY ci.item_id, ci.qty`,
      [id]
    );
    
    const allReturned = checkoutItemsResult.rows.every(row => row.qty <= row.returned_qty);
    
    if (allReturned) {
      await client.query(
        'UPDATE checkouts SET returned = true WHERE id = $1',
        [id]
      );
    }
    
    // Get event name for logging
    const eventResult = await client.query(
      'SELECT e.name FROM checkouts c JOIN events e ON c.event_id = e.id WHERE c.id = $1',
      [id]
    );
    const eventName = eventResult.rows[0]?.name || 'Event';
    
    // Log activity
    await client.query(
      'INSERT INTO activity (type, ref, details) VALUES ($1, $2, $3)',
      ['return', id, `${eventName} • processed returns`]
    );
    
    await client.query('COMMIT');
    res.json({ success: true, allReturned });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// File upload endpoint
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filename = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const filepath = path.join(__dirname, 'uploads', filename);

    // Process image with sharp (resize and crop if needed)
    await sharp(req.file.buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    res.json({ 
      success: true, 
      filename: filename,
      path: `/uploads/${filename}`
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Activity
app.get('/api/activity', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM activity ORDER BY date DESC LIMIT 200'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const [inventoryCount, lowStockCount, eventsCount, checkoutsCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM inventory'),
      pool.query('SELECT COUNT(*) as count FROM inventory WHERE qty_available <= safety_stock'),
      pool.query('SELECT COUNT(*) as count FROM events'),
      pool.query('SELECT COUNT(*) as count FROM checkouts')
    ]);
    
    res.json({
      items: parseInt(inventoryCount.rows[0].count),
      low: parseInt(lowStockCount.rows[0].count),
      events: parseInt(eventsCount.rows[0].count),
      checkouts: parseInt(checkoutsCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 InvTracker server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});
