const ClaimEvent = require('../models/ClaimEvent');
const { checkFraudRingMembership } = require('./fraudClusteringService');

const ZONE_BOUNDS = {
  'Bhubaneswar-Zone1': { minLat: 20.20, maxLat: 20.35, minLng: 85.75, maxLng: 85.90 },
  'Bhubaneswar-Zone2': { minLat: 20.20, maxLat: 20.35, minLng: 85.75, maxLng: 85.90 },
  'Cuttack-Zone1': { minLat: 20.40, maxLat: 20.55, minLng: 85.80, maxLng: 85.95 },
  'Rourkela-Zone1': { minLat: 22.15, maxLat: 22.30, minLng: 84.80, maxLng: 84.95 },
  'Puri-Zone1': { minLat: 19.75, maxLat: 19.85, minLng: 85.78, maxLng: 85.85 },
};

const isLocationInZone = (lat, lng, zone) => {
  const bounds = ZONE_BOUNDS[zone];
  if (!bounds) return false;
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
};

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const checkLocationConsistency = (claimedLocation, zone) => {
  const { lat, lng } = claimedLocation;
  const inZone = isLocationInZone(lat, lng, zone);
  return {
    passed: inZone,
    points: inZone ? 0 : 40,
    reason: inZone ? null : `Claimed location does not match declared zone (${zone})`,
  };
};

const checkDuplicateClaim = async (userId, triggerType) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentClaim = await ClaimEvent.findOne({
    user: userId,
    triggerType,
    createdAt: { $gte: twentyFourHoursAgo },
  });

  const isDuplicate = !!recentClaim;
  return {
    passed: !isDuplicate,
    points: isDuplicate ? 50 : 0,
    reason: isDuplicate ? `Duplicate ${triggerType} claim within 24 hours` : null,
  };
};

const checkImpossibleMovement = async (userId, claimedLocation) => {
  const lastClaim = await ClaimEvent.findOne({ user: userId }).sort({ createdAt: -1 });

  if (!lastClaim) {
    return { passed: true, points: 0, reason: null };
  }

  const hoursSinceLastClaim = (Date.now() - lastClaim.createdAt.getTime()) / (1000 * 60 * 60);
  const distance = distanceKm(
    lastClaim.claimedLocation.lat,
    lastClaim.claimedLocation.lng,
    claimedLocation.lat,
    claimedLocation.lng
  );

  const impliedSpeedKmh = hoursSinceLastClaim > 0 ? distance / hoursSinceLastClaim : Infinity;
  const isImpossible = impliedSpeedKmh > 60;

  return {
    passed: !isImpossible,
    points: isImpossible ? 60 : 0,
    reason: isImpossible
      ? `Implausible movement: ${distance.toFixed(1)}km in ${hoursSinceLastClaim.toFixed(2)}h (${impliedSpeedKmh.toFixed(0)} km/h implied)`
      : null,
  };
};

/**
 * NEW — Check 4: is this claim part of a detected coordinated fraud-ring cluster?
 */
const checkFraudRing = async (claimedLocation, zone) => {
  const { isPartOfRing, clusterSize } = await checkFraudRingMembership(claimedLocation, zone);
  return {
    passed: !isPartOfRing,
    points: isPartOfRing ? 70 : 0, // heavily weighted — coordinated fraud is the most serious signal
    reason: isPartOfRing
      ? `Claim location/time matches a cluster of ${clusterSize} claims — possible coordinated fraud ring`
      : null,
  };
};

const runFraudChecks = async ({ userId, claimedLocation, zone, triggerType }) => {
  const locationCheck = checkLocationConsistency(claimedLocation, zone);
  const duplicateCheck = await checkDuplicateClaim(userId, triggerType);
  const movementCheck = await checkImpossibleMovement(userId, claimedLocation);
  const ringCheck = await checkFraudRing(claimedLocation, zone);

  const checks = [locationCheck, duplicateCheck, movementCheck, ringCheck];
  const score = Math.min(100, checks.reduce((sum, check) => sum + check.points, 0)); // cap at 100
  const flags = checks.filter((c) => c.reason).map((c) => c.reason);

  let recommendation = 'approve';
  if (score >= 70) recommendation = 'reject';
  else if (score >= 30) recommendation = 'review';

  return { score, flags, recommendation };
};

module.exports = { runFraudChecks, distanceKm, isLocationInZone };