const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3005;
const LOG_FILE = path.join(__dirname, 'analytics.jsonl');
const DB_FILE = path.join(__dirname, 'analytics.db');

const db = new Database(DB_FILE);
console.log('Connected to SQLite database:', DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    referrer TEXT,
    client_timestamp TEXT,
    server_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    screen_width INTEGER,
    screen_height INTEGER,
    language TEXT,
    timezone TEXT,
    color_scheme TEXT,
    time_on_page INTEGER,
    lcp REAL,
    cls REAL,
    inp REAL,
    ttfb REAL,
    raw_payload TEXT
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(server_timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
`);

const insertStmt = db.prepare(`
  INSERT INTO events (
    session_id, user_id, event_type, url, title, referrer,
    client_timestamp, ip_address, user_agent,
    viewport_width, viewport_height, screen_width, screen_height,
    language, timezone, color_scheme, time_on_page,
    lcp, cls, inp, ttfb, raw_payload
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://test.jk135.site');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

/**
 * Insert an analytics event into the database.
 */
function insertEvent(payload, ip) {
  const tech = payload.technographics || {};
  const vitals = payload.vitals || {};
  const timing = payload.timing || {};

  const result = insertStmt.run(
    payload.session || null,
    payload.userId || null,
    payload.type || 'unknown',
    payload.url,
    payload.title || null,
    payload.referrer || null,
    payload.timestamp || null,
    ip || null,
    tech.userAgent || null,
    tech.viewportWidth || null,
    tech.viewportHeight || null,
    tech.screenWidth || null,
    tech.screenHeight || null,
    tech.language || null,
    tech.timezone || null,
    tech.colorScheme || null,
    payload.timeOnPage || null,
    vitals.lcp || null,
    vitals.cls || null,
    vitals.inp || null,
    timing.ttfb || null,
    JSON.stringify(payload)
  );

  return result.lastInsertRowid;
}

app.post('/collect', (req, res) => {
  const payload = req.body;

  if (!payload || !payload.url || !payload.type) {
    return res.status(400).json({ error: 'Missing required fields: url, type' });
  }

  payload.serverTimestamp = new Date().toISOString();

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  payload.ip = ip;

  try {
    const eventId = insertEvent(payload, ip);
    console.log(`Event ${eventId} logged: ${payload.type} from ${payload.session}`);

    const line = JSON.stringify(payload) + '\n';
    fs.appendFile(LOG_FILE, line, (err) => {
      if (err) console.error('File write error:', err);
    });

    res.sendStatus(204);
  } catch (err) {
    console.error('Database error:', err);
    
    const line = JSON.stringify(payload) + '\n';
    fs.appendFile(LOG_FILE, line, () => {});
    
    res.sendStatus(204);
  }
});

app.use(express.static(__dirname));

process.on('SIGTERM', () => {
  db.close();
  console.log('Database closed');
  process.exit(0);
});

process.on('SIGINT', () => {
  db.close();
  console.log('Database closed');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Analytics endpoint listening on http://localhost:${PORT}`);
  console.log(`Database file: ${DB_FILE}`);
  console.log(`Backup log file: ${LOG_FILE}`);
});