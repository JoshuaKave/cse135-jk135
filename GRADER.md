# Grader Guide

## Login Credentials

| Role | Username | Password | What they can see |
|------|----------|----------|-------------------|
| Super Admin | `admin` | `password123` | Everything, including user management |
| Analyst (performance) | `Sam` | `password456` | Performance report and saved reports only |
| Analyst (performance + behavioral) | `Sally` | `password789` | Performance, behavioral, and saved reports |
| Viewer | `viewer` | `viewer123` | Saved reports only (read-only, no commenting) |

---

## Suggested Walkthrough Scenario

**Step 1 — Log in as Super Admin**
Navigate to `https://reporting.jk135.site/login`. Sign in with `admin` / `password123`. You should land on the dashboard and see the KPI cards and charts load.

**Step 2 — Explore the dashboard**
Look at the Traffic Over Time chart (hourly events) and the Event Composition bar chart. Scroll down to the Recent Events table for some more info.

**Step 3 — Visit the Performance Report**
Click Reports → Performance Snapshot. Observe:
- The KPI cards now show **p75** values (75th percentile) alongside the mean. According to ChatGPT this is a standard used by Google so I went with that.
- The **Performance Budget table** shows each metric's p75 vs the Google "good" threshold. Green = healthy, red = action needed.
- The horizontal bar chart compares TTFB and LCP across individual pages.
- Scroll to the bottom and add an analyst comment, for example: "LCP is well within budget. TTFB warrants monitoring after the next deployment."

**Step 4 — Visit the Error Analysis Report**
Click Reports → Error Analysis. Observe:
- The **Error Triage table** ranks errors by priority (Critical → High → Medium → Low → Noise). Errors on the checkout page rank higher than errors on obscure pages.
- The Error Trend chart shows daily error volume over time.
- The Recent Error Log shows raw error events with session context for debugging.
- Add an analyst comment here as well.
- Note, there may not be that many errors due to me not visiting my site that many times to produce errors.

**Step 5 — Export a PDF**
While on any report page, click "Export PDF." A PDF should download containing text data of charts and some bar charts.

**Step 6 — Log out and log in as Sam (analyst, performance only)**
Sign out, then sign in as `Sam` / `password456`. Verify:
- Sam can access Performance Snapshot and the reports index.
- Attempting to navigate to `/reports/behavioral` should return a 403 page (access denied for that section).

**Step 7 — Log out and log in as the viewer**
Sign in as `viewer` / `viewer123`. Verify:
- The viewer lands on the reports index and can read the saved reports.
- The comment form is hidden — viewers cannot post comments.
- Navigating to `/dashboard` redirects or shows only what the viewer is allowed to see.
- Attempting `/reports/performance` directly returns 403.

**Step 8 — Return as admin and manage users (optional)**
Sign back in as `admin`. On the dashboard, scroll to the Admin section to see the user list. You can create a new user here and assign them a role and sections.



## Known Issues and Architectural Concerns


**PDF export is download-only (i.e. no email or link)**
The export generates a PDF server-side with charts, but it downloads immediately rather than saving to a persistent link or sending via email. I was not sure how to set up email so I decided to prioritize getting pdf exporting to at least work.

**Session secret is not obfuscated**
The Express session secret falls back to a hardcoded string (`reporting-simple-secret`). I did not have the time to make this obfuscated in an env file (it kept messing up and I gave up).
