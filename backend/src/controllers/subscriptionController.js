const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { calculateRiskScore } = require('../services/riskScoringService');
const { predictRiskTier } = require('../services/mlRiskService');

const PREMIUM_BY_TIER = { low: 20, medium: 40, high: 60 };

// @route  POST /api/subscriptions
// @desc   Create a weekly subscription. Supports both scoring methods via
//         `method` field in body: 'rule' (default) or 'ml'.
// @access Protected
const createSubscription = async (req, res) => {
  try {
    const { rainfallMm, temperatureC, aqi, activityScore, method = 'rule' } = req.body;

    if ([rainfallMm, temperatureC, aqi, activityScore].some((v) => v === undefined)) {
      return res.status(400).json({
        message: 'rainfallMm, temperatureC, aqi, and activityScore are required',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user.zone) {
      return res.status(400).json({ message: 'User must have a zone set to subscribe' });
    }

    let tier, premium, reasons, mlDetails;

    if (method === 'ml') {
      const prediction = predictRiskTier({ rainfallMm, temperatureC, aqi, activityScore });
      tier = prediction.tier;
      premium = PREMIUM_BY_TIER[tier];
      reasons = [`ML model prediction with ${(prediction.confidence * 100).toFixed(1)}% confidence`];
      mlDetails = prediction.probabilities;
    } else {
      const result = calculateRiskScore({ rainfallMm, temperatureC, aqi, activityScore });
      tier = result.tier;
      premium = result.premium;
      reasons = result.reasons;
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const subscription = await Subscription.create({
      user: user._id,
      riskTier: tier,
      premiumAmount: premium,
      zone: user.zone,
      startDate,
      endDate,
      scoringSnapshot: { rainfallMm, temperatureC, aqi, activityScore },
    });

    res.status(201).json({ subscription, reasons, scoringMethod: method, mlDetails });
  } catch (error) {
    res.status(500).json({ message: 'Subscription creation failed', error: error.message });
  }
};

// @route  GET /api/subscriptions/my
const getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
};

// @route  POST /api/subscriptions/compare
// @desc   Debug/demo endpoint — run both scoring methods side by side without creating a subscription
// @access Protected
const compareScoring = async (req, res) => {
  try {
    const { rainfallMm, temperatureC, aqi, activityScore } = req.body;

    if ([rainfallMm, temperatureC, aqi, activityScore].some((v) => v === undefined)) {
      return res.status(400).json({
        message: 'rainfallMm, temperatureC, aqi, and activityScore are required',
      });
    }

    const ruleResult = calculateRiskScore({ rainfallMm, temperatureC, aqi, activityScore });
    const mlResult = predictRiskTier({ rainfallMm, temperatureC, aqi, activityScore });

    res.status(200).json({
      ruleBasedResult: ruleResult,
      mlResult,
      agree: ruleResult.tier === mlResult.tier,
    });
  } catch (error) {
    res.status(500).json({ message: 'Comparison failed', error: error.message });
  }
};

module.exports = { createSubscription, getMySubscriptions, compareScoring };