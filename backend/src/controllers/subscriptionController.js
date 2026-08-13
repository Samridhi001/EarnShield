const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { calculateRiskScore } = require('../services/riskScoringService');

const createSubscription = async (req, res) => {
  try {
    const { rainfallMm, temperatureC, aqi, activityScore } = req.body;

    if ([rainfallMm, temperatureC, aqi, activityScore].some((v) => v === undefined)) {
      return res.status(400).json({
        message: 'rainfallMm, temperatureC, aqi, and activityScore are required',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user.zone) {
      return res.status(400).json({ message: 'User must have a zone set to subscribe' });
    }

    const { tier, premium, reasons } = calculateRiskScore({
      rainfallMm,
      temperatureC,
      aqi,
      activityScore,
    });

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

    res.status(201).json({ subscription, reasons });
  } catch (error) {
    res.status(500).json({ message: 'Subscription creation failed', error: error.message });
  }
};
const getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
};

module.exports = { createSubscription, getMySubscriptions };