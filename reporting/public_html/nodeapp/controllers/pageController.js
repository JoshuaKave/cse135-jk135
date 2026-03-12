const path = require('path');
const { getDb, getSavedReports, SECTIONS } = require('../lib/authDb');

const viewsBase = path.join(__dirname, '..', 'views');

function dashboard(req, res) {
  return res.sendFile(path.join(viewsBase, 'dashboard.html'));
}

function reports(req, res) {
  return res.sendFile(path.join(viewsBase, 'reports.html'));
}

function getDashboardConfig(req, res) {
  const user = req.session.user;
  const sections = Array.isArray(user.sections) ? user.sections : [];

  const config = {
    user,
    sections: {
      performance: user.role === 'super_admin' || sections.includes(SECTIONS.PERFORMANCE),
      behavioral: user.role === 'super_admin' || sections.includes(SECTIONS.BEHAVIORAL),
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
    const visibleReports = req.session.user.role === 'super_admin'
      ? reportsData
      : reportsData.filter((report) => report.sections.every((section) => req.session.user.sections.includes(section)));

    return res.json({ reports: visibleReports });
  } finally {
    db.close();
  }
}

module.exports = {
  dashboard,
  reports,
  getDashboardConfig,
  getReportsData
};
