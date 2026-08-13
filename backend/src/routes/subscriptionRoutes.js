const express = require('express');
const { createSubscription, getMySubscriptions } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createSubscription);
router.get('/my', protect, getMySubscriptions);

module.exports = router;