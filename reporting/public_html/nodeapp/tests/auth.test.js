const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  initializeAuthDb,
  findUserByCredentials,
  createUser,
  ROLES,
  SECTIONS,
  getSavedReports
} = require('../lib/authDb');

function createMemoryDb() {
  const db = new Database(':memory:');
  initializeAuthDb(db);
  return db;
}

test('seeded users have expected roles and scoped sections', () => {
  const db = createMemoryDb();

  const sam = findUserByCredentials(db, 'Sam', 'password456');
  const sally = findUserByCredentials(db, 'Sally', 'password789');
  const admin = findUserByCredentials(db, 'admin', 'password123');
  const viewer = findUserByCredentials(db, 'viewer', 'viewer123');

  assert.equal(admin.role, ROLES.SUPER_ADMIN);
  assert.equal(sam.role, ROLES.ANALYST);
  assert.equal(sally.role, ROLES.ANALYST);
  assert.equal(viewer.role, ROLES.VIEWER);

  assert.deepEqual(sam.sections.sort(), [SECTIONS.PERFORMANCE, SECTIONS.REPORTS].sort());
  assert.deepEqual(sally.sections.sort(), [SECTIONS.BEHAVIORAL, SECTIONS.PERFORMANCE, SECTIONS.REPORTS].sort());
  assert.deepEqual(viewer.sections, [SECTIONS.REPORTS]);

  db.close();
});

test('creating a viewer keeps access limited to saved reports', () => {
  const db = createMemoryDb();

  const user = createUser(db, {
    username: 'newviewer',
    password: 'plainpass',
    role: ROLES.VIEWER,
    sections: [SECTIONS.PERFORMANCE, SECTIONS.BEHAVIORAL]
  });

  assert.equal(user.role, ROLES.VIEWER);
  assert.deepEqual(user.sections, [SECTIONS.REPORTS]);

  db.close();
});

test('saved reports are seeded and parse into section arrays', () => {
  const db = createMemoryDb();
  const reports = getSavedReports(db);

  assert.ok(reports.length >= 2);
  assert.ok(reports.every((report) => Array.isArray(report.sections)));

  db.close();
});