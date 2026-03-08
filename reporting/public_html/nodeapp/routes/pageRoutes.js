const express = require('express');
const { dashboard, reports } = require('../controllers/pageController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', requireAuth, dashboard);
router.get('/reports', requireAuth, reports);

module.exports = router;
