const path = require('path');
const { getDb, getSavedReports, SECTIONS } = require('../lib/authDb');

const viewsBase = path.join(__dirname, '..', 'views');

function dashboard(req, res) {
  return res.sendFile(path.join(viewsBase, 'dashboard.html'));
}

function reports(req, res) {
  return res.sendFile(path.join(viewsBase, 'reports.html'));
}

function reportPerformance(req, res) {
  return res.sendFile(path.join(viewsBase, 'report-performance.html'));
}

function reportBehavioral(req, res) {
  return res.sendFile(path.join(viewsBase, 'report-behavioral.html'));
}

function reportErrors(req, res) {
  return res.sendFile(path.join(viewsBase, 'report-errors.html'));
}

function getDashboardConfig(req, res) {
  const user = req.session.user;
  const sections = Array.isArray(user.sections) ? user.sections : [];

  const config = {
    user,
    sections: {
      performance: user.role === 'super_admin' || sections.includes(SECTIONS.PERFORMANCE),
      behavioral: user.role === 'super_admin' || sections.includes(SECTIONS.BEHAVIORAL),
      errors: user.role === 'super_admin' || sections.includes(SECTIONS.ERRORS),
      reports: user.role === 'super_admin' || sections.includes(SECTIONS.REPORTS),
      admin: user.role === 'super_admin'
    }
  };

  return res.json(config);
}

function getReportsData(req, res) {
  const db = getDb();

  try {
    const reportsData = getSavedReports(db);
    const { role, sections } = req.session.user;
    const visibleReports = (role === 'super_admin' || role === 'viewer')
      ? reportsData
      : reportsData.filter((report) => report.sections.every((section) => sections.includes(section)));

    return res.json({ reports: visibleReports });
  } finally {
    db.close();
  }
}

module.exports = {
  dashboard,
  reports,
  reportPerformance,
  reportBehavioral,
  reportErrors,
  getDashboardConfig,
  getReportsData
};
