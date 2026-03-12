const express = require('express');
const {
	getLogin,
	postLogin,
	getSignup,
	postSignup,
	logout,
	getSessionInfo,
	getUsers
} = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.get('/signup', getSignup);
router.post('/signup', postSignup);
router.get('/logout', logout);
router.get('/api/auth/session', getSessionInfo);
router.get('/api/auth/users', requireAuth, requireRole('super_admin'), getUsers);

module.exports = router;
