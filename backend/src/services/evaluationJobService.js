const Subscription = require('../models/Subscription');
const ClaimEvent = require('../models/ClaimEvent');
const { evaluateZone } = require('./triggerService');
const { runFraudChecks } = require('./fraudDetectionService');
const { processPayout } = require('./payoutService');
const { ZONE_COORDINATES } = require('./weatherService');

/**
 * Automated evaluation sweep.
 *
 * For each zone with active subscriptions:
 *   1. Fetch live conditions once (not per-user — avoids hammering the API)
 *   2. Evaluate parametric triggers
 *   3. For each fired trigger, create claims for affected subscribers
 *   4. Run fraud checks, pay out approved claims
 *
 * Deliberately evaluates per-zone rather than per-subscription so one API
 * call serves every worker in that zone.
 */
const runEvaluationSweep = async () => {
  const startedAt = new Date();
  const summary = {
    zonesEvaluated: 0,
    triggersFired: 0,
    claimsCreated: 0,
    payoutsIssued: 0,
    totalPaidOut: 0,
    skipped: [],
    errors: [],
  };

  try {
    // Find zones that actually have active subscriptions — no point checking empty zones
    const activeZones = await Subscription.distinct('zone', {
      status: 'active',
      endDate: { $gte: new Date() },
    });

    for (const zone of activeZones) {
      if (!ZONE_COORDINATES[zone]) {
        summary.skipped.push(`${zone}: no coordinates configured`);
        continue;
      }

      try {
        const evaluation = await evaluateZone(zone);
        summary.zonesEvaluated++;

        if (!evaluation.anyTriggered) continue;

        const subscriptions = await Subscription.find({
          zone,
          status: 'active',
          endDate: { $gte: new Date() },
        });

        for (const trigger of evaluation.firedTriggers) {
          summary.triggersFired++;

          for (const subscription of subscriptions) {
            // Skip if this subscriber already has a claim for this trigger today —
            // prevents the sweep re-creating claims every time it runs
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const existingClaim = await ClaimEvent.findOne({
              user: subscription.user,
              triggerType: trigger.triggerType,
              createdAt: { $gte: startOfDay },
            });

            if (existingClaim) continue;

            const claimedLocation = ZONE_COORDINATES[zone];

            const fraudResult = await runFraudChecks({
              userId: subscription.user,
              claimedLocation: { lat: claimedLocation.lat, lng: claimedLocation.lng },
              zone,
              triggerType: trigger.triggerType,
            });

            const status = fraudResult.recommendation === 'reject' ? 'rejected'
              : fraudResult.recommendation === 'review' ? 'flagged'
              : 'approved';

            const claim = await ClaimEvent.create({
              user: subscription.user,
              subscription: subscription._id,
              triggerType: trigger.triggerType,
              zone,
              claimedLocation: { lat: claimedLocation.lat, lng: claimedLocation.lng },
              payoutAmount: trigger.payout,
              status,
              fraudCheck: {
                score: fraudResult.score,
                flags: fraudResult.flags,
                checkedAt: new Date(),
              },
            });

            summary.claimsCreated++;

            if (status === 'approved') {
              const payoutResult = await processPayout(
                subscription.user,
                claim._id,
                trigger.payout,
                `Automatic payout: ${trigger.reason}`
              );

              if (payoutResult.success) {
                summary.payoutsIssued++;
                summary.totalPaidOut += trigger.payout;
              }
            }
          }
        }
      } catch (zoneError) {
        summary.errors.push(`${zone}: ${zoneError.message}`);
      }
    }
  } catch (error) {
    summary.errors.push(`Sweep failed: ${error.message}`);
  }

  summary.startedAt = startedAt;
  summary.completedAt = new Date();
  summary.durationMs = summary.completedAt - startedAt;

  return summary;
};

module.exports = { runEvaluationSweep };