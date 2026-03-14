const path = require('path');
const {
  ROLES,
  SECTIONS,
  createUser,
  findUserByCredentials,
  getDb,
  listUsers,
  normalizePermissionsForRole
} = require('../lib/authDb');

const loginView = path.join(__dirname, '..', 'views', 'login.html');

function buildErrorRedirect(message) {
  return `/login?error=${encodeURIComponent(message)}`;
}

function parseSections(rawSections) {
  if (!rawSections) {
    return [];
  }

  if (Array.isArray(rawSections)) {
    return rawSections;
  }

  return String(rawSections)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getLogin(req, res) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.sendFile(loginView);
}

function postLogin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect(buildErrorRedirect('Username and password are required.'));
  }

  const db = getDb();

  try {
    const user = findUserByCredentials(db, username, password);
    if (!user) {
      return res.redirect(buildErrorRedirect('Invalid username or password.'));
    }

    req.session.user = user;
    return res.redirect('/dashboard');
  } finally {
    db.close();
  }
}

function getSignup(req, res) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.sendFile(loginView);
}

function postSignup(req, res) {
  const { username, password, display_name: displayName, role } = req.body;
  const requestedSections = parseSections(req.body.sections);

  if (!username || !password) {
    return res.redirect(buildErrorRedirect('Signup requires a username and password.'));
  }

  const db = getDb();

  try {
    const allowedRoles = new Set(Object.values(ROLES));
    const selectedRole = allowedRoles.has(role) ? role : ROLES.VIEWER;
    const requestedPermissionSet = normalizePermissionsForRole(selectedRole, requestedSections)
      .filter((section) => Object.values(SECTIONS).includes(section));

    const user = createUser(db, {
      username,
      password,
      displayName,
      role: selectedRole,
      sections: requestedPermissionSet
    });

    req.session.user = user;
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('[signup] createUser failed:', error.message);
    if (String(error.message).includes('UNIQUE')) {
      return res.redirect(buildErrorRedirect('That username is already taken.'));
    }
    return res.redirect(buildErrorRedirect('Failed to create account.'));
  } finally {
    db.close();
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

function getSessionInfo(req, res) {
  return res.json({
    authenticated: Boolean(req.session && req.session.user),
    user: req.session?.user || null
  });
}

function getUsers(req, res) {
  const db = getDb();

  try {
    return res.json({ users: listUsers(db) });
  } finally {
    db.close();
  }
}

module.exports = {
  getLogin,
  postLogin,
  getSignup,
  postSignup,
  logout,
  getSessionInfo,
  getUsers
};
