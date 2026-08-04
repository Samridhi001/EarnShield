const express = require('express');
const { signup, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

// @route  GET /api/auth/me  — protected, returns logged-in user's own data
router.get('/me', protect, (req, res) => {
  res.status(200).json(req.user);
});

module.exports = router;