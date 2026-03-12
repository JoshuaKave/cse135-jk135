# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# IMPORTANT INFORMATION

This repository serves as a local dev environment for a remote server (develop locally, push to github which triggers actions to deploy remotely). That is why the directory names like collector and reporting are different from hardcoded ones (collector vs collector.jk135.site), the hardcoded names are the names in the remote repository.

## Project Overview

CSE 135 web analytics platform for a deliberately flawed e-commerce site ("Wrecked Tech"). Four subdirectories map to subdomains:

| Directory | Subdomain | Port | Purpose |
|-----------|-----------|------|---------|
| `base/` | base.jk135.site | 3000 | Reference Express server |
| `collector/` | collector.jk135.site | 3005 | Analytics data collection endpoint |
| `reporting/` | reporting.jk135.site | 3006 | Reporting dashboard with auth |
| `test/` | test.jk135.site | — | Intentionally buggy e-commerce site |

## Commands

```bash
# Install dependencies (run in each nodeapp/ directory)
cd collector/public_html/nodeapp && npm install
cd reporting/public_html/nodeapp && npm install

# Start servers
node collector/public_html/nodeapp/endpoint.js   # port 3005
node reporting/public_html/nodeapp/reporting_api.js  # port 3006

# Run auth tests (Node.js built-in test runner)
node --test reporting/public_html/nodeapp/tests/auth.test.js
```

No bundler, linter, or build step. All JS/CSS is vanilla. ZingChart and ZingGrid loaded via CDN.

## Architecture

### Data Flow

Test site loads collector scripts → collector.js captures user behavior → `sendBeacon`/fetch to collector endpoint → SQLite + JSONL storage → reporting API reads same DB → dashboard visualizes with ZingChart

### Collector (`collector/public_html/`)

**`collector.js`** — Client-side IIFE (v9) using a command queue pattern (`window._cq`). Initialization: `_cq.push(['init', { endpoint: '...' }])`. Sends four event types: `pageview`, `event`, `page_exit`, `error`.

Key subsystems:
- **Consent**: GDPR opt-in via `ConsentManager` (`consent.js`), respects Global Privacy Control
- **Bot detection**: Checks webdriver, headless browser, automation globals
- **Session management**: 30-min sessions stored in sessionStorage
- **Web vitals**: LCP, CLS, INP via PerformanceObserver
- **Error tracking**: JS errors + promise rejections, deduplicated, max 10
- **Retry queue**: Failed beacons saved to sessionStorage (max 50)

**Extensions** (plugin system via `collector.use()`):
- `ext-click.js` — Click tracking with CSS selector path (300ms debounce)
- `ext-scroll.js` — Scroll depth at 25/50/75/100% thresholds
- `ext-keyboard.js` — Key events with hold duration (max 200 events)

**`endpoint.js`** — Express server storing events in SQLite (`analytics.db`, 16-column events table). CORS restricted to `https://test.jk135.site`. Also writes JSONL backup.

### Reporting (`reporting/public_html/nodeapp/`)

MVC Express app. The reporting DB path points to the collector's database: `../../collector.jk135.site/public_html/nodeapp/analytics.db`.

**Auth system** (`lib/authDb.js`):
- Roles: `super_admin` (all access), `analyst` (scoped sections), `viewer` (reports only)
- Sections: `performance`, `behavioral`, `reports`, `admin`
- Plain-text passwords (intentional for class project)
- Seeded users: `admin`/`password123`, `Sam`/`password456`, `Sally`/`password789`, `viewer`/`viewer123`

**Middleware** (`middleware/auth.js`): `requireAuth`, `requireRole(...roles)`, `requireSection(...sections)` — section checks use OR logic.

**API routes**: CRUD on `/api/events`, `/api/sessions`, `/api/stats/summary`, `/api/auth/*`, `/api/dashboard/config`, `/api/reports`.

**Views**: `dashboard.html` (ZingChart line+pie charts, ZingGrid table), `reports.html` (filtered by user sections), `login.html` (dual sign-in/sign-up form).

### Test Site (`test/public_html/`)

Intentionally flawed e-commerce site. Pages: index, products, product-detail, checkout, 404. Includes `chaos.js` for random error generation. All pages embed collector scripts. See `test/public_html/readme.md` for the full spec of intentional flaws (no lazy loading, blocking scripts, memory leaks, accessibility issues, etc.).

## Deployment

GitHub Actions (`.github/workflows/github-actions.yaml`) deploys on push to `main` via rsync+SSH. Exclusions in `deploy/exclude.txt`.
