const express = require('express');
const { submitClaim, getMyClaims } = require('../controllers/claimController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, submitClaim);
router.get('/my', protect, getMyClaims);

module.exports = router;