const express = require('express');
const { triggerEvaluation, getZoneConditions } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/run-evaluation', protect, triggerEvaluation);
router.get('/zone-conditions/:zone', protect, getZoneConditions);

module.exports = router;