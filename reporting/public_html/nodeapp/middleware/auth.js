const path = require('path');

const viewsBase = path.join(__dirname, '..', 'views');

function isApiRequest(req) {
  return req.path.startsWith('/api/') || req.accepts('html', 'json') === 'json';
}

function hasRole(user, roles) {
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}

function hasSectionAccess(user, section) {
  if (!user) {
    return false;
  }

  if (user.role === 'super_admin') {
    return true;
  }

  return Array.isArray(user.sections) && user.sections.includes(section);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (hasRole(req.session?.user, roles)) {
      return next();
    }

    if (isApiRequest(req)) {
      return res.status(403).json({ error: 'Insufficient role privileges.' });
    }
    return res.status(403).sendFile(path.join(viewsBase, '403.html'));
  };
}

function requireSection(...sections) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (sections.some((section) => hasSectionAccess(user, section))) {
      return next();
    }

    if (isApiRequest(req)) {
      return res.status(403).json({ error: 'Section access denied.' });
    }
    return res.status(403).sendFile(path.join(viewsBase, '403.html'));
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireSection,
  hasSectionAccess
};
