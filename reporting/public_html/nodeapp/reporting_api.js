const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');

const app = express();
const PORT = 3006;

const DB_FILE = path.join(__dirname, '../../..', 'collector.jk135.site/public_html/nodeapp/analytics.db');
const db = new Database(DB_FILE, { readonly: false });
console.log('Connected to SQLite database:', DB_FILE);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: 'reporting-simple-secret',
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// GET /api/events - Retrieve all events
app.get('/api/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const rows = db.prepare(`
      SELECT * FROM events 
      ORDER BY server_timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id - Retrieve a specific event
app.get('/api/events/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events - Add a new event
app.post('/api/events', (req, res) => {
  try {
    const { event_type, url, title, session_id, user_agent } = req.body;
    if (!event_type || !url) {
      return res.status(400).json({ error: 'event_type and url are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO events (event_type, url, title, session_id, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(event_type, url, title || null, session_id || null, user_agent || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:id - Update a specific event
app.put('/api/events/:id', (req, res) => {
  try {
    const { event_type, url, title } = req.body;
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const stmt = db.prepare(`
      UPDATE events 
      SET event_type = ?, url = ?, title = ?
      WHERE id = ?
    `);
    stmt.run(
      event_type || existing.event_type,
      url || existing.url,
      title || existing.title,
      req.params.id
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id - Delete a specific event
app.delete('/api/events/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions - Retrieve all unique sessions
app.get('/api/sessions', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        session_id,
        COUNT(*) as event_count,
        MIN(server_timestamp) as first_seen,
        MAX(server_timestamp) as last_seen
      FROM events 
      WHERE session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY last_seen DESC
      LIMIT 100
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id - Retrieve events for a specific session
app.get('/api/sessions/:id', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM events 
      WHERE session_id = ?
      ORDER BY server_timestamp ASC
    `).all(req.params.id);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sessions/:id - Delete all events for a session
app.delete('/api/sessions/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM events WHERE session_id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ message: `Deleted ${result.changes} events` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/stats/summary - Get overall statistics
app.get('/api/stats/summary', (req, res) => {
  try {
    const stats = {
      total_events: db.prepare('SELECT COUNT(*) as count FROM events').get().count,
      unique_sessions: db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM events').get().count,
      event_types: db.prepare(`
        SELECT event_type, COUNT(*) as count 
        FROM events 
        GROUP BY event_type
      `).all(),
      recent_events: db.prepare(`
        SELECT * FROM events 
        ORDER BY server_timestamp DESC 
        LIMIT 10
      `).all()
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Simple MVC web routes for login + protected pages
app.use(authRoutes);
app.use(pageRoutes);

// Graceful shutdown
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Reporting API listening on http://localhost:${PORT}`);
});