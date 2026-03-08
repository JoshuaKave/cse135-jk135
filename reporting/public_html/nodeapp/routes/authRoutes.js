const express = require('express');
const { getLogin, postLogin, logout } = require('../controllers/authController');

const router = express.Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.get('/logout', logout);

module.exports = router;
