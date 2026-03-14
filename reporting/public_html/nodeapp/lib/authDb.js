const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const SALT_ROUNDS = 10;

const fs = require('fs');

// Remote uses collector.jk135.site/, local uses collector/
const remoteDbPath = path.join(__dirname, '../../../..', 'collector.jk135.site/public_html/nodeapp/analytics.db');
const localDbPath = path.join(__dirname, '../../../..', 'collector/public_html/nodeapp/analytics.db');
const DB_FILE = fs.existsSync(remoteDbPath) ? remoteDbPath : localDbPath;

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer'
};

const SECTIONS = {
  PERFORMANCE: 'performance',
  BEHAVIORAL: 'behavioral',
  REPORTS: 'reports',
  ADMIN: 'admin'
};

function getDb() {
  return new Database(DB_FILE, { readonly: false });
}

function seedDefaultUsers(db) {
  const existingCount = db.prepare('SELECT COUNT(*) AS count FROM auth_users').get().count;
  if (existingCount > 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO auth_users (username, password, role, display_name)
    VALUES (@username, @password, @role, @display_name)
  `);
  const insertPermission = db.prepare(`
    INSERT INTO auth_user_sections (user_id, section_key)
    VALUES (?, ?)
  `);
  const insertReport = db.prepare(`
    INSERT INTO auth_saved_reports (name, slug, description, sections_json, is_static)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    const adminInfo = insertUser.run({
      username: 'admin',
      password: bcrypt.hashSync('password123', SALT_ROUNDS),
      role: ROLES.SUPER_ADMIN,
      display_name: 'Super Admin'
    });

    insertPermission.run(adminInfo.lastInsertRowid, SECTIONS.ADMIN);

    const samInfo = insertUser.run({
      username: 'Sam',
      password: bcrypt.hashSync('password456', SALT_ROUNDS),
      role: ROLES.ANALYST,
      display_name: 'Sam'
    });
    [SECTIONS.PERFORMANCE, SECTIONS.REPORTS].forEach((section) => {
      insertPermission.run(samInfo.lastInsertRowid, section);
    });

    const sallyInfo = insertUser.run({
      username: 'Sally',
      password: bcrypt.hashSync('password789', SALT_ROUNDS),
      role: ROLES.ANALYST,
      display_name: 'Sally'
    });
    [SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL, SECTIONS.REPORTS].forEach((section) => {
      insertPermission.run(sallyInfo.lastInsertRowid, section);
    });

    const viewerInfo = insertUser.run({
      username: 'viewer',
      password: bcrypt.hashSync('viewer123', SALT_ROUNDS),
      role: ROLES.VIEWER,
      display_name: 'Read Only Viewer'
    });
    insertPermission.run(viewerInfo.lastInsertRowid, SECTIONS.REPORTS);

    insertReport.run(
      'Performance Snapshot',
      'performance-snapshot',
      'Static report for performance KPIs and event mix.',
      JSON.stringify([SECTIONS.PERFORMANCE]),
      1
    );
    insertReport.run(
      'Behavior + Performance Overview',
      'behavior-performance-overview',
      'Combined view for behavioral and performance analytics.',
      JSON.stringify([SECTIONS.BEHAVIORAL, SECTIONS.PERFORMANCE]),
      1
    );
    insertReport.run(
      'Error Analysis',
      'error-analysis',
      'JavaScript errors, promise rejections, and resource failures.',
      JSON.stringify([SECTIONS.PERFORMANCE]),
      1
    );
  });

  seed();
}

function initializeAuthDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'analyst', 'viewer')),
      display_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_user_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      section_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, section_key),
      FOREIGN KEY(user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_saved_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      sections_json TEXT NOT NULL,
      is_static INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_report_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_slug TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      comment_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );
  `);

  seedDefaultUsers(db);

  // Migrate any pre-existing plain-text passwords to bcrypt hashes
  const plainTextUsers = db.prepare(
    "SELECT id, password FROM auth_users WHERE password NOT LIKE '$2b$%' AND password NOT LIKE '$2a$%'"
  ).all();
  if (plainTextUsers.length > 0) {
    const updatePwd = db.prepare('UPDATE auth_users SET password = ? WHERE id = ?');
    const migratePwds = db.transaction(() => {
      plainTextUsers.forEach((u) => {
        updatePwd.run(bcrypt.hashSync(u.password, SALT_ROUNDS), u.id);
      });
    });
    migratePwds();
    console.log(`Migrated ${plainTextUsers.length} plain-text password(s) to bcrypt hashes.`);
  }
}

function normalizePermissionsForRole(role, sections = []) {
  if (role === ROLES.SUPER_ADMIN) {
    return Object.values(SECTIONS);
  }

  if (role === ROLES.VIEWER) {
    return [SECTIONS.REPORTS];
  }

  const unique = new Set(sections.filter(Boolean));
  unique.add(SECTIONS.REPORTS);
  return Array.from(unique);
}

function hydrateUserRecord(db, row) {
  if (!row) {
    return null;
  }

  const sectionRows = db.prepare(`
    SELECT section_key
    FROM auth_user_sections
    WHERE user_id = ?
    ORDER BY section_key ASC
  `).all(row.id);

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    role: row.role,
    sections: normalizePermissionsForRole(row.role, sectionRows.map((entry) => entry.section_key))
  };
}

function findUserByCredentials(db, username, password) {
  const row = db.prepare(`
    SELECT id, username, password, role, display_name
    FROM auth_users
    WHERE username = ?
  `).get(username);

  // Same error path for "no such user" and "wrong password" — prevents user enumeration
  if (!row || !bcrypt.compareSync(password, row.password)) {
    return null;
  }

  return hydrateUserRecord(db, row);
}

function findUserById(db, id) {
  const row = db.prepare(`
    SELECT id, username, password, role, display_name
    FROM auth_users
    WHERE id = ?
  `).get(id);

  return hydrateUserRecord(db, row);
}

function listUsers(db) {
  const rows = db.prepare(`
    SELECT id, username, role, display_name, created_at
    FROM auth_users
    ORDER BY created_at ASC, username ASC
  `).all();

  return rows.map((row) => ({
    ...hydrateUserRecord(db, row),
    createdAt: row.created_at
  }));
}

function createUser(db, { username, password, role, displayName, sections = [] }) {
  const normalizedRole = role || ROLES.VIEWER;
  const normalizedSections = normalizePermissionsForRole(normalizedRole, sections);

  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO auth_users (username, password, role, display_name)
      VALUES (?, ?, ?, ?)
    `).run(username, bcrypt.hashSync(password, SALT_ROUNDS), normalizedRole, displayName || username);

    const insertPermission = db.prepare(`
      INSERT OR IGNORE INTO auth_user_sections (user_id, section_key)
      VALUES (?, ?)
    `);

    normalizedSections.forEach((section) => {
      if (normalizedRole === ROLES.SUPER_ADMIN && section === SECTIONS.REPORTS) {
        return;
      }
      insertPermission.run(info.lastInsertRowid, section);
    });

    return info.lastInsertRowid;
  });

  const userId = transaction();
  return findUserById(db, userId);
}

function getSavedReports(db) {
  return db.prepare(`
    SELECT id, name, slug, description, sections_json, is_static, created_at
    FROM auth_saved_reports
    ORDER BY name ASC
  `).all().map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sections: JSON.parse(row.sections_json),
    isStatic: Boolean(row.is_static),
    createdAt: row.created_at
  }));
}

function deleteUser(db, userId) {
  return db.prepare('DELETE FROM auth_users WHERE id = ?').run(userId);
}

function getReportComments(db, reportSlug) {
  return db.prepare(`
    SELECT id, report_slug, user_id, username, comment_text, created_at
    FROM auth_report_comments
    WHERE report_slug = ?
    ORDER BY created_at ASC
  `).all(reportSlug);
}

function addReportComment(db, { reportSlug, userId, username, commentText }) {
  const info = db.prepare(`
    INSERT INTO auth_report_comments (report_slug, user_id, username, comment_text)
    VALUES (?, ?, ?, ?)
  `).run(reportSlug, userId, username, commentText);
  return info.lastInsertRowid;
}

module.exports = {
  DB_FILE,
  ROLES,
  SECTIONS,
  getDb,
  initializeAuthDb,
  findUserByCredentials,
  findUserById,
  listUsers,
  createUser,
  deleteUser,
  getSavedReports,
  getReportComments,
  addReportComment,
  normalizePermissionsForRole
};