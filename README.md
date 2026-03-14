# CSE 135 Web Analytics Platform

A web analytics system built for a deliberately flawed e-commerce test site. The platform collects behavioral and performance data, stores it, and exposes it through a reporting dashboard with role-based access control.

- **Repository:** https://github.com/JoshuaKave/cse135-jk135
- **Test site:** https://test.jk135.site
- **Reporting dashboard:** https://reporting.jk135.site/login
- **Collector endpoint:** https://collector.jk135.site
- **Reference server:** https://jk135.site

## Technical Overview

### Collector

The collector is a client-side JavaScript library (`collector.js`). I am not sure how much detail I need to talk about this because it was pretty much provided by the professor. 

It uses a command queue pattern (`window._cq`) so that calls made before the script loads are buffered and replayed on initialization.

It captures four event types: `pageview`, `page_exit`, `event`, and `error`. Page exits are recorded using `visibilitychange` and `beforeunload` events and carry timing data like time-on-page. Web Vitals (LCP, CLS, INP) are captured through the `PerformanceObserver` API, which operates asynchronously and does not block rendering.

A few subsystems worth noting:

- **Consent:** The collector defaults to no tracking. Users must explicitly opt in via a GDPR-style consent banner before any data is sent. It also respects the Global Privacy Control (`navigator.globalPrivacyControl`) signal.
- **Bot detection:** Checks for WebDriver flags, headless browser globals, and automation frameworks. An earlier version had an overly aggressive check that I ended up removing because all my friends that I said to test my site were getting skipped over and flagged as bots.
- **Session management:** Sessions are scoped to a 30-minute sliding window using `sessionStorage` and a cookie-backed session ID. Each session ID is a short random string prefixed with `s_`.
- **Retry queue:** Failed beacon deliveries are stored in `sessionStorage` and retried on the next page load, capped at 50 to avoid unbounded storage.
- **Extensions:** Click tracking, scroll depth, and keyboard event tracking are implemented as opt-in plugins via `collector.use()`. I ended up not logging this data in my reports because I was not sure how to make these useful (I initially thought about click tracking for user engagement but decided that page visits and time on page were more useful).

Data is sent to the collector endpoint via `navigator.sendBeacon` with a `fetch` fallback for browsers that don't support it.

### Collector Endpoint

The server side of the collector is a small Express app (`endpoint.js`) running on port 3005. It receives POST requests at `/collect`, validates required fields, and writes events to a SQLite database (`analytics.db`) as well as a JSONL flat-file backup. I decided to use SQlite because I did not want to set up another server for something like Postgresql. CORS is restricted to `https://test.jk135.site` so the endpoint cannot be freely posted to from arbitrary origins.

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

Authentication is session-based using `express-session`. Passwords are stored as bcrypt hashes (10 rounds). On startup, the server runs a migration that detects any plain-text passwords left from an earlier version and hashes them automatically. (This was copied from the professor's example on cse135.site)

There are three roles:

- **`super_admin`** — unrestricted access including user management
- **`analyst`** — access scoped to a configured set of sections (performance, behavioral, reports, admin)
- **`viewer`** — read-only access to saved reports only

Middleware (`requireAuth`, `requireRole`, `requireSection`) enforces these rules at the route level. The "no such user" and "wrong password" cases return the same error message to prevent username enumeration (attacker being able to guess username's by differing error messages).

### Database Storage

Both the analytics events and the auth tables (users, sections, saved reports, comments) live in a single SQLite file. SQLite was chosen deliberately for simplicity — there is no database server to provision, and `better-sqlite3` gives synchronous access which fits well with the single-threaded Express model. The auth tables are created with `CREATE TABLE IF NOT EXISTS` on startup, and a seed function populates default users if the table is empty.

For percentile calculations (p75), SQLite has no built-in `PERCENTILE_CONT` function. The workaround is to sort the column and use `LIMIT 1 OFFSET (COUNT * 0.75)` to pick the 75th row — a clean approximation that works well at the data volumes this system sees.

### Charting: ZingChart vs. Plain HTML/CSS

The dashboard uses two different charting approaches depending on the complexity of the data being visualized.

**ZingChart** is used for multi-series or time-series data that I deemed better than to use just html. Things like the traffic over time spline chart, the grouped horizontal bar chart comparing TTFB and LCP across pages, and the session area chart. These require interpolation, axes, legends, and tooltips that would be impractical to replicate from scratch.

**Plain HTML/CSS** bars are used for simpler single-series distributions that would be silly to rely on a library (I think Zingchart is a library) like ZingChart or ZingGrid for. For example, I used html for the event composition breakdown, errors by page, device breakdown, and referrers. These render instantly with no external dependency, are accessible, and are easy to style consistently. They also degrade gracefully if JavaScript is slow.

ZingChart is loaded via CDN with a `defer` attribute so it never blocks the initial page render. One gotcha: ZingChart uses a global `ZC` namespace guard (`if (typeof ZC === 'undefined')`). If anything in the page defines a `var ZC` before the CDN script loads, ZingChart silently skips initialization. An early version of my code had this conflict and it took a while to diagnose. Here, Claude helped a lot with debugging (ironically good here but really bad when dealing with decision making, will talk about that later).

### PDF Export

PDF export uses the `pdfkit` library, which draws to a PDF canvas server-side using Node.js. When a user clicks "Export PDF" on any report page, the server runs the relevant database queries, builds the document, and streams it directly to the browser as a download.

The PDF includes bar charts, analyst comments (though really bad formatting that I could not figure out how to fix), and some text for data that could not be adapted to bar charts (or alteast I could not figure out how to).


## AI Use

I used Claude throughout the last part of this project (after doing the user auth part). It was genuinely helpful for implementing areas I did not know how to do like the `pdfkit` drawing API, and structuring the Express session middleware. Having a reference implementation to read and adapt saved meaningful time.

That said, it also sucked at other stuff:

**PDF export.** The AI's first instinct was to use Puppeteer which is ridiculous. There is no way I would need such a large implementation. It wanted to launch a headless Chromium instance, navigate to the report page, and screenshot it into a PDF. That approach would have added a 150+ MB dependency and introduced serious complexity around session handling (getting Puppeteer authenticated to reach the protected report pages). I had to steer it toward `pdfkit` and drawing the charts as primitives.

**Chart generation.** The charts the AI initially produced were technically functional but wrong in obvious ways that made them pretty useless. Labels were being assigned to the wrong axis (scale X vs scale Y in ZingChart's `hbar` type), units were missing from tooltips, and auto-hiding was silently dropping labels that did not fit (this was so bad because certain labels like page urls looked like they had multiple TTFB values which is impossible to my knowledge). I ended up doing the charts myself because Claude was so bad at it.

## Roadmap

Things I would have liked to add given more time:

- **Email delivery for PDF exports.** According to Claude, I would need to do nodemailer + an SMTP service, but I ran out of time (did not want to risk looking into this and breaking everything).
- **Rate limiting on auth endpoints.** The login and signup routes have no rate limiting which is problematic if this was an actual site used by people.
- **Real-time dashboard updates.** The current dashboard requires a page refresh to see new data. Server-Sent Events or a polling interval would make it more useful for live monitoring.
- **Filtering and date range selection.** All reports currently show all-time data. A date range picker would let analysts zoom in on specific deployments or incidents.
- **Funnel analysis.** Given that the test site has a checkout flow (product list → product detail → checkout), tracking drop-off rates through that funnel would be useful.
- **Alerting.** When the error rate crosses a threshold or a performance budget is breached, it would be useful to get a notification rather than having to check the dashboard manually. I am not sure how the alert would be implemented, maybe through a text via Twilio api or email api.
