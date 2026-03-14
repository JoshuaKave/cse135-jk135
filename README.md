# CSE 135 Web Analytics Platform

A web analytics system built for a deliberately flawed e-commerce test site. The platform collects behavioral and performance data, stores it, and exposes it through a reporting dashboard with role-based access control.

- **Repository:** https://github.com/JoshuaKave/cse135-jk135
- **Test site:** https://test.jk135.site
- **Reporting dashboard:** https://reporting.jk135.site
- **Collector endpoint:** https://collector.jk135.site
- **Reference server:** https://base.jk135.site

---

## Technical Overview

### Collector

The collector is a client-side JavaScript library (`collector.js`) written as a self-contained IIFE. It uses a command queue pattern (`window._cq`) so that calls made before the script loads are buffered and replayed on initialization.

It captures four event types: `pageview`, `page_exit`, `event`, and `error`. Page exits are recorded using `visibilitychange` and `beforeunload` events and carry timing data like time-on-page. Web Vitals (LCP, CLS, INP) are captured through the `PerformanceObserver` API, which operates asynchronously and does not block rendering.

A few subsystems worth noting:

- **Consent:** The collector defaults to no tracking. Users must explicitly opt in via a GDPR-style consent banner before any data is sent. It also respects the Global Privacy Control (`navigator.globalPrivacyControl`) signal.
- **Bot detection:** Checks for WebDriver flags, headless browser globals, and automation frameworks. An earlier version had an overly aggressive check that blocked real users on Chrome for iOS and Brave — that was removed.
- **Session management:** Sessions are scoped to a 30-minute sliding window using `sessionStorage` and a cookie-backed session ID. Each session ID is a short random string prefixed with `s_`.
- **Retry queue:** Failed beacon deliveries are stored in `sessionStorage` and retried on the next page load, capped at 50 to avoid unbounded storage.
- **Extensions:** Click tracking, scroll depth, and keyboard event tracking are implemented as opt-in plugins via `collector.use()`.

Data is sent to the collector endpoint via `navigator.sendBeacon` with a `fetch` fallback for browsers that don't support it.

### Collector Endpoint

The server side of the collector is a small Express app (`endpoint.js`) running on port 3005. It receives POST requests at `/collect`, validates required fields, and writes events to a SQLite database (`analytics.db`) as well as a JSONL flat-file backup. CORS is restricted to `https://test.jk135.site` so the endpoint cannot be freely posted to from arbitrary origins.

The SQLite table has 16 columns covering the event type, URL, session ID, viewport dimensions, user agent, referrer, raw payload, and server timestamp. Indexes on `event_type`, `session_id`, and `server_timestamp` keep the reporting queries fast even as the table grows.

### REST API and Reporting Server

The reporting dashboard is a server-rendered Express application. It serves HTML pages and a JSON API. The key API routes are:

- `GET /api/stats/performance` — averages and p75 percentiles for TTFB, LCP, CLS, INP, grouped globally and by page
- `GET /api/stats/behavioral` — session data, top pages, and event type breakdown
- `GET /api/stats/errors` — error events grouped by message for triage, by page, by day, plus raw event log
- `GET /api/stats/technographics` — viewport/device breakdown, language, timezone, and color scheme preference
- `GET /api/stats/referrers` — traffic source breakdown
- `GET /api/reports/:slug/comments` / `POST` — analyst comment CRUD
- `GET /api/export/:slug` — PDF export

All routes require authentication. Section-level routes additionally check which sections the authenticated user is permitted to access.

The reporting server connects to the same `analytics.db` file that the collector writes to, which keeps the architecture simple with no additional sync layer.

### Authentication and Authorization

Authentication is session-based using `express-session`. Passwords are stored as bcrypt hashes (10 rounds). On startup, the server runs a migration that detects any plain-text passwords left from an earlier version and hashes them automatically.

There are three roles:

- **`super_admin`** — unrestricted access including user management
- **`analyst`** — access scoped to a configured set of sections (performance, behavioral, reports, admin)
- **`viewer`** — read-only access to saved reports only

Middleware (`requireAuth`, `requireRole`, `requireSection`) enforces these rules at the route level. The "no such user" and "wrong password" cases return the same error message to prevent username enumeration.

### Database Storage

Both the analytics events and the auth tables (users, sections, saved reports, comments) live in a single SQLite file. SQLite was chosen deliberately for simplicity — there is no database server to provision, and `better-sqlite3` gives synchronous access which fits well with the single-threaded Express model. The auth tables are created with `CREATE TABLE IF NOT EXISTS` on startup, and a seed function populates default users if the table is empty.

For percentile calculations (p75), SQLite has no built-in `PERCENTILE_CONT` function. The workaround is to sort the column and use `LIMIT 1 OFFSET (COUNT * 0.75)` to pick the 75th row — a clean approximation that works well at the data volumes this system sees.

### Charting: ZingChart vs. Plain HTML/CSS

The dashboard uses two different charting approaches depending on the complexity of the data being visualized.

**ZingChart** is used for multi-series or time-series data — things like the traffic over time spline chart, the grouped horizontal bar chart comparing TTFB and LCP across pages, and the session area chart. These require interpolation, axes, legends, and tooltips that would be impractical to replicate from scratch.

**Plain HTML/CSS** bars are used for simpler single-series distributions — the event composition breakdown, errors by page, device breakdown, referrers. These render instantly with no external dependency, are accessible, and are easy to style consistently. They also degrade gracefully if JavaScript is slow.

ZingChart is loaded via CDN with a `defer` attribute so it never blocks the initial page render. One gotcha: ZingChart uses a global `ZC` namespace guard (`if (typeof ZC === 'undefined')`). If anything in the page defines a `var ZC` before the CDN script loads, ZingChart silently skips initialization. An early version of the code had exactly this conflict and it took a while to diagnose.

### PDF Export

PDF export uses the `pdfkit` library, which draws to a PDF canvas server-side using Node.js. When a user clicks "Export PDF" on any report page, the server runs the relevant database queries, builds the document, and streams it directly to the browser as a download.

The PDF includes KPI metric cards (drawn as colored rounded rectangles), horizontal bar charts (drawn using `pdfkit`'s `rect()` primitive), and the analyst comments section at the bottom.

**Known drawback:** The export is a direct browser download. The original plan was to add an email delivery option or save PDFs to a persistent URL. Neither was implemented due to time constraints. Email delivery would require setting up an SMTP transport (or a service like SendGrid), and saving to a URL would require either a file system path accessible to the web server or an object storage bucket — more infrastructure than was reasonable for a class project. The download experience works fine in practice.

---

## AI Use

AI assistance was used throughout the project. It was genuinely helpful for implementing areas I hadn't touched before — the bcrypt password migration, the `pdfkit` drawing API, and structuring the Express session middleware. Having a reference implementation to read and adapt saved meaningful time.

That said, two areas were frustrating enough that I had to take over substantially:

**PDF export.** The AI's first instinct was to use Puppeteer — launch a headless Chromium instance, navigate to the report page, and screenshot it into a PDF. That approach would have added a 150+ MB dependency and introduced serious complexity around session handling (getting Puppeteer authenticated to reach the protected report pages). I redirected it toward `pdfkit` and drawing the charts as primitives, which is the right tool for this job.

**Chart generation.** The charts the AI initially produced were technically functional but wrong in subtle ways — labels were being assigned to the wrong axis (scale X vs scale Y in ZingChart's `hbar` type), units were missing from tooltips, and auto-hiding was silently dropping labels that didn't fit, making the charts misleading rather than just ugly. The performance-by-page chart in particular looked like it was rendering two TTFB values for the same page because the page labels were invisible. I ended up specifying the chart configuration directly once I understood ZingChart's data model well enough to see what was wrong.

The overall takeaway is that AI is good at accelerating unfamiliar boilerplate but not reliable for domain-specific configuration where subtle errors are hard to see at a glance.

---

## Roadmap

Things I would have liked to add given more time:

- **Email delivery for PDF exports.** The infrastructure for this is straightforward (nodemailer + an SMTP service), but I ran out of time to wire it up cleanly.
- **Rate limiting on auth endpoints.** The login and signup routes have no rate limiting. `express-rate-limit` is the obvious addition.
- **Real-time dashboard updates.** The current dashboard requires a page refresh to see new data. Server-Sent Events or a polling interval would make it more useful for live monitoring.
- **Filtering and date range selection.** All reports currently show all-time data. A date range picker would let analysts zoom in on specific deployments or incidents.
- **Funnel analysis.** Given that the test site has a checkout flow (product list → product detail → checkout), tracking drop-off rates through that funnel would be a natural extension of the behavioral report.
- **Alerting.** When the error rate crosses a threshold or a performance budget is breached, it would be useful to get a notification rather than having to check the dashboard manually.
