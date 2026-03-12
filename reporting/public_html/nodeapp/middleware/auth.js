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

    return res.status(403).json({ error: 'Insufficient role privileges.' });
  };
}

function requireSection(...sections) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (sections.some((section) => hasSectionAccess(user, section))) {
      return next();
    }

    return res.status(403).json({ error: 'Section access denied.' });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireSection,
  hasSectionAccess
};
