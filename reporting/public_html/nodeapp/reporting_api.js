const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');
const { DB_FILE, initializeAuthDb, getDb, getReportComments, addReportComment, deleteUser } = require('./lib/authDb');
const { requireAuth, requireSection, requireRole } = require('./middleware/auth');
const { SECTIONS } = require('./lib/authDb');

const app = express();
const PORT = 3006;

const db = new Database(DB_FILE, { readonly: false });
console.log('Connected to SQLite database:', DB_FILE);
initializeAuthDb(db);

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

// ── Events CRUD ──────────────────────────────────────────

app.get('/api/events', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL), (req, res) => {
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

app.get('/api/events/:id', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL), (req, res) => {
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

app.post('/api/events', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL), (req, res) => {
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

app.put('/api/events/:id', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL), (req, res) => {
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

app.delete('/api/events/:id', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL), (req, res) => {
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

// ── Sessions ─────────────────────────────────────────────

app.get('/api/sessions', requireAuth, requireSection(SECTIONS.BEHAVIORAL), (req, res) => {
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

app.get('/api/sessions/:id', requireAuth, requireSection(SECTIONS.BEHAVIORAL), (req, res) => {
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

app.delete('/api/sessions/:id', requireAuth, requireSection(SECTIONS.BEHAVIORAL), (req, res) => {
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

// ── Stats Summary ────────────────────────────────────────

app.get('/api/stats/summary', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.REPORTS), (req, res) => {
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

// ── Performance Stats ────────────────────────────────────

app.get('/api/stats/performance', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.REPORTS), (req, res) => {
  try {
    const vitals = db.prepare(`
      SELECT
        COUNT(*) as sample_count,
        ROUND(AVG(ttfb), 2) as avg_ttfb,
        ROUND(AVG(lcp), 2) as avg_lcp,
        ROUND(AVG(cls), 4) as avg_cls,
        ROUND(AVG(inp), 2) as avg_inp,
        ROUND(AVG(time_on_page), 2) as avg_time_on_page,
        ROUND(MIN(ttfb), 2) as min_ttfb,
        ROUND(MAX(ttfb), 2) as max_ttfb,
        ROUND(MIN(lcp), 2) as min_lcp,
        ROUND(MAX(lcp), 2) as max_lcp
      FROM events
      WHERE ttfb IS NOT NULL OR lcp IS NOT NULL
    `).get();

    const byPage = db.prepare(`
      SELECT
        url,
        COUNT(*) as hits,
        ROUND(AVG(ttfb), 2) as avg_ttfb,
        ROUND(AVG(lcp), 2) as avg_lcp,
        ROUND(AVG(cls), 4) as avg_cls
      FROM events
      WHERE event_type = 'page_exit' OR event_type = 'pageview'
      GROUP BY url
      ORDER BY hits DESC
      LIMIT 20
    `).all();

    const volumeByHour = db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00', server_timestamp) as hour_bucket,
        COUNT(*) as count
      FROM events
      WHERE server_timestamp IS NOT NULL
      GROUP BY hour_bucket
      ORDER BY hour_bucket ASC
      LIMIT 168
    `).all();

    res.json({ vitals, byPage, volumeByHour });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Behavioral Stats ─────────────────────────────────────

app.get('/api/stats/behavioral', requireAuth, requireSection(SECTIONS.BEHAVIORAL, SECTIONS.REPORTS), (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT
        session_id,
        COUNT(*) as event_count,
        MIN(server_timestamp) as first_seen,
        MAX(server_timestamp) as last_seen,
        GROUP_CONCAT(DISTINCT event_type) as event_types,
        MAX(time_on_page) as max_time_on_page
      FROM events
      WHERE session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY last_seen DESC
      LIMIT 50
    `).all();

    const topPages = db.prepare(`
      SELECT
        url,
        COUNT(*) as pageviews,
        COUNT(DISTINCT session_id) as unique_sessions,
        ROUND(AVG(time_on_page), 1) as avg_time_on_page
      FROM events
      WHERE event_type IN ('pageview', 'page_exit')
      GROUP BY url
      ORDER BY pageviews DESC
      LIMIT 20
    `).all();

    const eventTypesBySession = db.prepare(`
      SELECT
        event_type,
        COUNT(DISTINCT session_id) as session_count,
        COUNT(*) as total_count
      FROM events
      WHERE session_id IS NOT NULL
      GROUP BY event_type
      ORDER BY total_count DESC
    `).all();

    res.json({ sessions, topPages, eventTypesBySession });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Error Stats ──────────────────────────────────────────

app.get('/api/stats/errors', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.REPORTS), (req, res) => {
  try {
    const errorEvents = db.prepare(`
      SELECT id, url, title, session_id, server_timestamp, raw_payload
      FROM events
      WHERE event_type = 'error'
      ORDER BY server_timestamp DESC
      LIMIT 200
    `).all();

    const errorsByPage = db.prepare(`
      SELECT url, COUNT(*) as error_count
      FROM events
      WHERE event_type = 'error'
      GROUP BY url
      ORDER BY error_count DESC
      LIMIT 20
    `).all();

    const errorsByDay = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', server_timestamp) as day,
        COUNT(*) as count
      FROM events
      WHERE event_type = 'error' AND server_timestamp IS NOT NULL
      GROUP BY day
      ORDER BY day ASC
      LIMIT 90
    `).all();

    const totalErrors = db.prepare(`
      SELECT COUNT(*) as count FROM events WHERE event_type = 'error'
    `).get().count;

    const totalEvents = db.prepare(`
      SELECT COUNT(*) as count FROM events
    `).get().count;

    res.json({
      errors: errorEvents,
      errorsByPage,
      errorsByDay,
      totalErrors,
      totalEvents,
      errorRate: totalEvents > 0 ? (totalErrors / totalEvents * 100).toFixed(2) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Technographics Stats ─────────────────────────────────

app.get('/api/stats/technographics', requireAuth, requireSection(SECTIONS.BEHAVIORAL, SECTIONS.REPORTS), (req, res) => {
  try {
    const viewportBreakdown = db.prepare(`
      SELECT
        CASE
          WHEN viewport_width < 576 THEN 'Mobile (<576px)'
          WHEN viewport_width < 992 THEN 'Tablet (576-991px)'
          WHEN viewport_width < 1440 THEN 'Desktop (992-1439px)'
          ELSE 'Large (1440px+)'
        END as device_class,
        COUNT(*) as count
      FROM events
      WHERE viewport_width IS NOT NULL
      GROUP BY device_class
      ORDER BY count DESC
    `).all();

    const colorScheme = db.prepare(`
      SELECT
        COALESCE(color_scheme, 'unknown') as scheme,
        COUNT(*) as count
      FROM events
      WHERE color_scheme IS NOT NULL AND color_scheme != ''
      GROUP BY scheme
      ORDER BY count DESC
    `).all();

    const languages = db.prepare(`
      SELECT
        SUBSTR(language, 1, 2) as lang,
        COUNT(*) as count
      FROM events
      WHERE language IS NOT NULL AND language != ''
      GROUP BY lang
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const timezones = db.prepare(`
      SELECT
        timezone as tz,
        COUNT(*) as count
      FROM events
      WHERE timezone IS NOT NULL AND timezone != ''
      GROUP BY tz
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.json({ viewportBreakdown, colorScheme, languages, timezones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Referrer Stats ───────────────────────────────────────

app.get('/api/stats/referrers', requireAuth, requireSection(SECTIONS.BEHAVIORAL, SECTIONS.REPORTS), (req, res) => {
  try {
    const referrers = db.prepare(`
      SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct / None'
          ELSE referrer
        END as source,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as sessions
      FROM events
      WHERE event_type IN ('pageview', 'page_exit')
      GROUP BY source
      ORDER BY count DESC
      LIMIT 15
    `).all();

    res.json({ referrers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Report Comments ──────────────────────────────────────

app.get('/api/reports/:slug/comments', requireAuth, (req, res) => {
  const authDb = getDb();
  try {
    const comments = getReportComments(authDb, req.params.slug);
    res.json({ comments });
  } finally {
    authDb.close();
  }
});

app.post('/api/reports/:slug/comments', requireAuth, (req, res) => {
  const user = req.session.user;
  if (user.role === 'viewer') {
    return res.status(403).json({ error: 'Viewers cannot add comments.' });
  }

  const { comment_text } = req.body;
  if (!comment_text || !comment_text.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  const authDb = getDb();
  try {
    const id = addReportComment(authDb, {
      reportSlug: req.params.slug,
      userId: user.id,
      username: user.displayName || user.username,
      commentText: comment_text.trim()
    });
    res.status(201).json({ id });
  } finally {
    authDb.close();
  }
});

// ── Admin: Delete User ───────────────────────────────────

app.delete('/api/auth/users/:id', requireAuth, requireRole('super_admin'), (req, res) => {
  const authDb = getDb();
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }
    const result = deleteUser(authDb, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ message: 'User deleted.' });
  } finally {
    authDb.close();
  }
});

// ── PDF Export ────────────────────────────────────────────

app.get('/api/export/:slug', requireAuth, (req, res) => {
  const PDFDocument = require('pdfkit');
  const slug = req.params.slug;
  const authDb = getDb();

  // Short display name from a full URL
  function pageName(url) {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      const name = parts.length ? parts[parts.length - 1].replace('.html', '') : 'home';
      const id = u.searchParams.get('id');
      return id ? name + ' #' + id : (name || 'home');
    } catch (e) {
      return url.length > 28 ? '\u2026' + url.slice(-27) : url;
    }
  }

  // Draw a horizontal bar chart with title
  function drawHBarChart(doc, title, items, valueLabel, color) {
    if (!items || items.length === 0) return;
    const ML = doc.page.margins.left;
    const MR = doc.page.margins.right;
    const PW = doc.page.width - ML - MR;
    const LW = 155;
    const TW = PW - LW - 52;
    const maxVal = Math.max.apply(null, items.map(function(i) { return i.value || 0; }));
    const ROW_H = 18;
    const BAR_H = 10;

    doc.fontSize(11).fillColor('#1a3a4a').text(title);
    doc.moveDown(0.2);

    items.forEach(function(item) {
      const y = doc.y;
      const bw = (maxVal > 0 && item.value > 0) ? Math.max((item.value / maxVal) * TW, 2) : 2;
      const bx = ML + LW;
      const by = y + Math.round((ROW_H - BAR_H) / 2);

      doc.fontSize(7.5).fillColor('#4a5568')
        .text(String(item.label), ML, y + 2, { width: LW - 6, lineBreak: false });

      doc.save().rect(bx, by, bw, BAR_H).fill(color || '#2c5f7c').restore();

      doc.fontSize(7.5).fillColor('#333')
        .text((item.value != null ? item.value : '\u2014') + (valueLabel ? ' ' + valueLabel : ''), bx + TW + 4, y + 2, { lineBreak: false });

      doc.y = y + ROW_H;
    });

    doc.moveDown(0.75);
  }

  // Draw a row of KPI metric cards
  function drawKPIRow(doc, kpis) {
    const ML = doc.page.margins.left;
    const PW = doc.page.width - ML - doc.page.margins.right;
    const gap = 10;
    const cardW = Math.floor((PW - gap * (kpis.length - 1)) / kpis.length);
    const cardH = 54;
    const y = doc.y;

    kpis.forEach(function(kpi, i) {
      const x = ML + i * (cardW + gap);
      doc.save().roundedRect(x, y, cardW, cardH, 4).fill('#eef5f8').restore();
      doc.fontSize(6.5).fillColor('#888')
        .text(String(kpi.label).toUpperCase(), x + 8, y + 9, { width: cardW - 16, lineBreak: false });
      doc.fontSize(17).fillColor('#1a3a4a')
        .text(String(kpi.value) + (kpi.unit || ''), x + 8, y + 22, { width: cardW - 16, lineBreak: false });
    });

    doc.y = y + cardH + 14;
  }

  // Draw analyst comments
  function drawComments(doc, comments) {
    if (comments.length === 0) return;
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#1a3a4a').text('Analyst Comments');
    doc.moveDown(0.3);
    comments.forEach(function(c) {
      doc.fontSize(8).fillColor('#888').text(String(c.username) + '  \u00b7  ' + c.created_at);
      doc.fontSize(9.5).fillColor('#333').text(String(c.comment_text));
      doc.moveDown(0.4);
    });
  }

  try {
    const comments = getReportComments(authDb, slug);
    let title, buildPdf;

    if (slug === 'performance-snapshot') {
      title = 'Performance Snapshot';
      const vitals = db.prepare(`
        SELECT COUNT(*) as sample_count,
          ROUND(AVG(ttfb), 1) as avg_ttfb, ROUND(AVG(lcp), 1) as avg_lcp,
          ROUND(AVG(cls), 4) as avg_cls, ROUND(AVG(inp), 1) as avg_inp
        FROM events WHERE ttfb IS NOT NULL OR lcp IS NOT NULL
      `).get();
      const byPage = db.prepare(`
        SELECT url, COUNT(*) as hits, ROUND(AVG(ttfb), 1) as avg_ttfb, ROUND(AVG(lcp), 1) as avg_lcp
        FROM events WHERE event_type IN ('pageview', 'page_exit')
        GROUP BY url ORDER BY hits DESC LIMIT 10
      `).all();

      buildPdf = function(doc) {
        drawKPIRow(doc, [
          { label: 'Avg TTFB', value: vitals.avg_ttfb != null ? vitals.avg_ttfb : '\u2014', unit: ' ms' },
          { label: 'Avg LCP',  value: vitals.avg_lcp  != null ? vitals.avg_lcp  : '\u2014', unit: ' ms' },
          { label: 'Avg CLS',  value: vitals.avg_cls  != null ? vitals.avg_cls  : '\u2014', unit: '' },
          { label: 'Avg INP',  value: vitals.avg_inp  != null ? vitals.avg_inp  : '\u2014', unit: ' ms' },
          { label: 'Samples',  value: vitals.sample_count || 0, unit: '' }
        ]);
        drawHBarChart(doc, 'Avg TTFB by Page',
          byPage.map(function(p) { return { label: pageName(p.url), value: p.avg_ttfb || 0 }; }),
          'ms', '#2c5f7c');
        drawHBarChart(doc, 'Avg LCP by Page',
          byPage.map(function(p) { return { label: pageName(p.url), value: p.avg_lcp || 0 }; }),
          'ms', '#3a8a9e');
        drawComments(doc, comments);
      };

    } else if (slug === 'behavior-performance-overview') {
      title = 'Behavior + Performance Overview';
      const topPages = db.prepare(`
        SELECT url, COUNT(*) as pageviews, COUNT(DISTINCT session_id) as unique_sessions
        FROM events WHERE event_type IN ('pageview', 'page_exit')
        GROUP BY url ORDER BY pageviews DESC LIMIT 10
      `).all();
      const sessionCount = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM events').get().count;
      const eventTypes = db.prepare(`
        SELECT event_type, COUNT(*) as total_count
        FROM events GROUP BY event_type ORDER BY total_count DESC
      `).all();

      buildPdf = function(doc) {
        drawKPIRow(doc, [
          { label: 'Total Sessions', value: sessionCount, unit: '' },
          { label: 'Pages Tracked',  value: topPages.length, unit: '' },
          { label: 'Event Types',    value: eventTypes.length, unit: '' }
        ]);
        drawHBarChart(doc, 'Pageviews by Page',
          topPages.map(function(p) { return { label: pageName(p.url), value: p.pageviews }; }),
          '', '#2c5f7c');
        drawHBarChart(doc, 'Unique Sessions by Page',
          topPages.map(function(p) { return { label: pageName(p.url), value: p.unique_sessions }; }),
          '', '#3a8a9e');
        drawHBarChart(doc, 'Event Type Distribution',
          eventTypes.map(function(e) { return { label: e.event_type, value: e.total_count }; }),
          'events', '#88b7c4');
        drawComments(doc, comments);
      };

    } else if (slug === 'error-analysis') {
      title = 'Error Analysis';
      const totalErrors = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_type = 'error'").get().count;
      const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
      const errorsByPage = db.prepare(`
        SELECT url, COUNT(*) as error_count FROM events
        WHERE event_type = 'error' GROUP BY url ORDER BY error_count DESC LIMIT 10
      `).all();
      const errorsByDay = db.prepare(`
        SELECT strftime('%m-%d', server_timestamp) as day, COUNT(*) as count
        FROM events WHERE event_type = 'error' AND server_timestamp IS NOT NULL
        GROUP BY day ORDER BY day ASC LIMIT 30
      `).all();
      const errorRate = totalEvents > 0 ? (totalErrors / totalEvents * 100).toFixed(2) : 0;

      buildPdf = function(doc) {
        drawKPIRow(doc, [
          { label: 'Total Errors', value: totalErrors, unit: '' },
          { label: 'Total Events', value: totalEvents, unit: '' },
          { label: 'Error Rate',   value: errorRate,   unit: '%' }
        ]);
        drawHBarChart(doc, 'Errors by Page',
          errorsByPage.map(function(p) { return { label: pageName(p.url), value: p.error_count }; }),
          'errors', '#c9553d');
        drawHBarChart(doc, 'Daily Error Trend',
          errorsByDay.map(function(d) { return { label: d.day, value: d.count }; }),
          '', '#e8735c');
        drawComments(doc, comments);
      };

    } else {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'letter' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.pdf"`);
    doc.pipe(res);

    // Dark header banner
    const HH = 72;
    doc.save().rect(0, 0, doc.page.width, HH).fill('#0f2b38').restore();
    const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.fontSize(20).fillColor('#ffffff')
      .text(title, doc.page.margins.left, 20, { align: 'center', width: contentW });
    doc.fontSize(8).fillColor('rgba(255,255,255,0.55)')
      .text('Generated: ' + new Date().toLocaleString(), doc.page.margins.left, 46, { align: 'center', width: contentW });
    doc.y = HH + 18;

    buildPdf(doc);
    doc.end();

  } catch (err) {
    authDb.close();
    res.status(500).json({ error: err.message });
    return;
  }
  authDb.close();
});

// ── Static Files ─────────────────────────────────────────

app.use(express.static(path.join(__dirname, '..')));

// ── MVC Routes ───────────────────────────────────────────

app.use(authRoutes);
app.use(pageRoutes);

// ── 404 Catch-all ────────────────────────────────────────

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// ── 500 Error Handler ─────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).sendFile(path.join(__dirname, 'views', '500.html'));
});

// ── Graceful Shutdown ────────────────────────────────────

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
