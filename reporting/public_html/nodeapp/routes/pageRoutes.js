const express = require('express');
const {
	dashboard,
	reports,
	getDashboardConfig,
	getReportsData
} = require('../controllers/pageController');
const { requireAuth, requireSection } = require('../middleware/auth');
const { SECTIONS } = require('../lib/authDb');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', requireAuth, dashboard);
router.get('/reports', requireAuth, requireSection(SECTIONS.REPORTS), reports);
router.get('/api/dashboard/config', requireAuth, getDashboardConfig);
router.get('/api/reports', requireAuth, requireSection(SECTIONS.REPORTS), getReportsData);

module.exports = router;
