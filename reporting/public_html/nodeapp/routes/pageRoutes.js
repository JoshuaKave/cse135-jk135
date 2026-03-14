const express = require('express');
const {
	dashboard,
	reports,
	reportPerformance,
	reportBehavioral,
	reportErrors,
	getDashboardConfig,
	getReportsData
} = require('../controllers/pageController');
const { requireAuth, requireSection } = require('../middleware/auth');
const { SECTIONS } = require('../lib/authDb');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', requireAuth, dashboard);
router.get('/reports', requireAuth, requireSection(SECTIONS.REPORTS), reports);
router.get('/reports/performance', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.REPORTS), reportPerformance);
router.get('/reports/behavioral', requireAuth, requireSection(SECTIONS.BEHAVIORAL, SECTIONS.REPORTS), reportBehavioral);
router.get('/reports/errors', requireAuth, requireSection(SECTIONS.PERFORMANCE, SECTIONS.REPORTS), reportErrors);
router.get('/api/dashboard/config', requireAuth, getDashboardConfig);
router.get('/api/reports', requireAuth, requireSection(SECTIONS.REPORTS), getReportsData);

module.exports = router;
