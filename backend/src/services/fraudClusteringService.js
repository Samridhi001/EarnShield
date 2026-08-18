const ClaimEvent = require('../models/ClaimEvent');

/**
 * Lightweight DBSCAN implementation for fraud ring detection.
 *
 * Clusters recent claims by (lat, lng, submissionTime) similarity.
 * Points in a dense cluster (>= minPoints neighbors within eps distance)
 * are flagged as a potential coordinated fraud ring. Isolated points are
 * left unflagged — this mirrors the Python prototype in ml/scripts/fraud_clustering.py.
 */

const scalePoints = (points) => {
  const LAT_RANGE = 0.15;
  const LNG_RANGE = 0.15;
  const TIME_RANGE_MINUTES = 30;

  return points.map((p) => ({
    ...p,
    scaled: {
      lat: p.lat / LAT_RANGE,
      lng: p.lng / LNG_RANGE,
      minutesSinceEpoch: p.minutesSinceEpoch / TIME_RANGE_MINUTES,
    },
  }));
};

const euclideanDistance = (a, b) => {
  const dims = ['lat', 'lng', 'minutesSinceEpoch'];
  const sumSq = dims.reduce((sum, dim) => sum + (a.scaled[dim] - b.scaled[dim]) ** 2, 0);
  return Math.sqrt(sumSq);
};

const dbscan = (points, eps = 0.15, minPoints = 3) => {
  const labels = new Array(points.length).fill(null);
  let clusterId = 0;

  const regionQuery = (idx) => {
    return points.reduce((neighbors, _, otherIdx) => {
      if (euclideanDistance(points[idx], points[otherIdx]) <= eps) {
        neighbors.push(otherIdx);
      }
      return neighbors;
    }, []);
  };

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== null) continue;

    const neighbors = regionQuery(i);
    if (neighbors.length < minPoints) {
      labels[i] = -1;
      continue;
    }

    labels[i] = clusterId;
    const seeds = [...neighbors];

    for (let j = 0; j < seeds.length; j++) {
      const seedIdx = seeds[j];
      if (labels[seedIdx] === -1) labels[seedIdx] = clusterId;
      if (labels[seedIdx] !== null) continue;

      labels[seedIdx] = clusterId;
      const seedNeighbors = regionQuery(seedIdx);
      if (seedNeighbors.length >= minPoints) {
        seeds.push(...seedNeighbors.filter((n) => !seeds.includes(n)));
      }
    }

    clusterId++;
  }

  return labels;
};

const checkFraudRingMembership = async (newClaimLocation, zone) => {

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const recentClaims = await ClaimEvent.find({
    zone,
    createdAt: { $gte: sixHoursAgo },
  }).select('claimedLocation createdAt');

  const rawPoints = recentClaims.map((claim) => ({
    lat: claim.claimedLocation.lat,
    lng: claim.claimedLocation.lng,
    timestamp: claim.createdAt.getTime(),
  }));
  rawPoints.push({
    lat: newClaimLocation.lat,
    lng: newClaimLocation.lng,
    timestamp: Date.now(),
  });

  if (rawPoints.length < 4) {
    return { isPartOfRing: false, clusterSize: 0 };
  }

  const earliestTimestamp = Math.min(...rawPoints.map((p) => p.timestamp));
  const points = rawPoints.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    minutesSinceEpoch: (p.timestamp - earliestTimestamp) / 60000,
  }));

  const scaledPoints = scalePoints(points);
  const labels = dbscan(scaledPoints, 0.05, 3);
  const newClaimLabel = labels[labels.length - 1];
  const isPartOfRing = newClaimLabel !== -1;
  const clusterSize = isPartOfRing ? labels.filter((l) => l === newClaimLabel).length : 0;

  return { isPartOfRing, clusterSize };
};

module.exports = { dbscan, checkFraudRingMembership };