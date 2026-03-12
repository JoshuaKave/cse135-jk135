# Reporting app auth model

This app now includes a first-pass authentication and authorization layer backed by SQLite.

## What it supports

- Database-backed users with plain-text passwords for this class milestone
- Signup flow
- Roles:
  - `super_admin`: full access, including user management
  - `analyst`: access to assigned analytics sections plus reports
  - `viewer`: access only to saved reports
- Section-level permissions:
  - `performance`
  - `behavioral`
  - `reports`
  - `admin`

## Seeded users

- `admin` / `password123`
- `Sam` / `password456`
- `Sally` / `password789`
- `viewer` / `viewer123`

## Notes

- Auth tables are created lazily in the same SQLite database used by the reporting app.
- Passwords are intentionally not hashed yet, per your request.
- Saved reports are currently static records stored in `auth_saved_reports`.
- Super admins can view a simple user list on the dashboard.