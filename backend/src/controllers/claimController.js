const ClaimEvent = require('../models/ClaimEvent');
const Subscription = require('../models/Subscription');
const { runFraudChecks } = require('../services/fraudDetectionService');
const { processPayout } = require('../services/payoutService');

const TRIGGER_PAYOUTS = {
  rainfall: 200,
  temperature: 150,
  aqi: 180,
  storeClosure: 180,
  appDowntime: 100,
};

// @route  POST /api/claims
const submitClaim = async (req, res) => {
  try {
    const { subscriptionId, triggerType, claimedLocation } = req.body;

    if (!subscriptionId || !triggerType || !claimedLocation) {
      return res.status(400).json({
        message: 'subscriptionId, triggerType, and claimedLocation are required',
      });
    }

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: req.user._id,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found for this user' });
    }

    const fraudResult = await runFraudChecks({
      userId: req.user._id,
      claimedLocation,
      zone: subscription.zone,
      triggerType,
    });

    const status = fraudResult.recommendation === 'reject' ? 'rejected'
      : fraudResult.recommendation === 'review' ? 'flagged'
      : 'approved';

    const payoutAmount = TRIGGER_PAYOUTS[triggerType] || 0;

    const claim = await ClaimEvent.create({
      user: req.user._id,
      subscription: subscription._id,
      triggerType,
      zone: subscription.zone,
      claimedLocation,
      payoutAmount,
      status,
      fraudCheck: {
        score: fraudResult.score,
        flags: fraudResult.flags,
        checkedAt: new Date(),
      },
    });

    let payoutResult = null;

    if (status === 'approved') {
      payoutResult = await processPayout(
        req.user._id,
        claim._id,
        payoutAmount,
        `Payout for ${triggerType} claim`
      );
    }

    res.status(201).json({ claim, fraudAssessment: fraudResult, payoutResult });
  } catch (error) {
    res.status(500).json({ message: 'Claim submission failed', error: error.message });
  }
};

const getMyClaims = async (req, res) => {
  try {
    const claims = await ClaimEvent.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch claims', error: error.message });
  }
};

module.exports = { submitClaim, getMyClaims };