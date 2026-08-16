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
  const dims = ['lat', 'lng', 'minutesSinceEpoch'];
  const mins = {}, maxs = {};

  dims.forEach((dim) => {
    const values = points.map((p) => p[dim]);
    mins[dim] = Math.min(...values);
    maxs[dim] = Math.max(...values);
  });

  return points.map((p) => {
    const scaled = {};
    dims.forEach((dim) => {
      const range = maxs[dim] - mins[dim];
      scaled[dim] = range === 0 ? 0 : (p[dim] - mins[dim]) / range;
    });
    return { ...p, scaled };
  });
};

const euclideanDistance = (a, b) => {
  const dims = ['lat', 'lng', 'minutesSinceEpoch'];
  const sumSq = dims.reduce((sum, dim) => sum + (a.scaled[dim] - b.scaled[dim]) ** 2, 0);
  return Math.sqrt(sumSq);
};


const dbscan = (points, eps = 0.15, minPoints = 3) => {
  const labels = new Array(points.length).fill(null); // null = unvisited
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

  const points = recentClaims.map((claim) => ({
    lat: claim.claimedLocation.lat,
    lng: claim.claimedLocation.lng,
    minutesSinceEpoch: claim.createdAt.getTime() / 60000,
  }));
  points.push({
    lat: newClaimLocation.lat,
    lng: newClaimLocation.lng,
    minutesSinceEpoch: Date.now() / 60000,
  });

  if (points.length < 4) {
    return { isPartOfRing: false, clusterSize: 0 };
  }

  const scaledPoints = scalePoints(points);
  const labels = dbscan(scaledPoints, 0.15, 3);

  const newClaimLabel = labels[labels.length - 1];
  const isPartOfRing = newClaimLabel !== -1;
  const clusterSize = isPartOfRing ? labels.filter((l) => l === newClaimLabel).length : 0;

  return { isPartOfRing, clusterSize };
};

module.exports = { dbscan, checkFraudRingMembership };