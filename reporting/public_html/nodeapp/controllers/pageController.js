const path = require('path');

const viewsBase = path.join(__dirname, '..', 'views');

function dashboard(req, res) {
  return res.sendFile(path.join(viewsBase, 'dashboard.html'));
}

function reports(req, res) {
  return res.sendFile(path.join(viewsBase, 'reports.html'));
}

module.exports = {
  dashboard,
  reports
};
