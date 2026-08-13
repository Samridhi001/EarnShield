const PREMIUM_BY_TIER = {
  low: 20,
  medium: 40,
  high: 60,
};

const THRESHOLDS = {
  rainfall: { medium: 20, high: 50 }, // mm/day
  temperature: { medium: 38, high: 45 }, // Celsius
  aqi: { medium: 150, high: 300 },
};

/**
 * @param {Object} input
 * @param {number} input.rainfallMm
 * @param {number} input.temperatureC
 * @param {number} input.aqi
 * @param {number} input.activityScore - 0 to 1, worker's recent activity consistency
 * @returns {{ tier: 'low'|'medium'|'high', premium: number, reasons: string[] }}
 */
const calculateRiskScore = ({ rainfallMm = 0, temperatureC = 0, aqi = 0, activityScore = 1 }) => {
  const reasons = [];
  let tier = 'low';

  if (rainfallMm >= THRESHOLDS.rainfall.high) {
    tier = 'high';
    reasons.push(`Rainfall ${rainfallMm}mm exceeds high threshold`);
  } else if (rainfallMm >= THRESHOLDS.rainfall.medium) {
    tier = 'medium';
    reasons.push(`Rainfall ${rainfallMm}mm exceeds medium threshold`);
  }

  if (temperatureC >= THRESHOLDS.temperature.high) {
    tier = 'high';
    reasons.push(`Temperature ${temperatureC}°C exceeds high threshold`);
  } else if (temperatureC >= THRESHOLDS.temperature.medium && tier !== 'high') {
    tier = 'medium';
    reasons.push(`Temperature ${temperatureC}°C exceeds medium threshold`);
  }

  if (aqi >= THRESHOLDS.aqi.high) {
    tier = 'high';
    reasons.push(`AQI ${aqi} exceeds high threshold`);
  } else if (aqi >= THRESHOLDS.aqi.medium && tier !== 'high') {
    tier = 'medium';
    reasons.push(`AQI ${aqi} exceeds medium threshold`);
  }

  if (activityScore < 0.4 && tier === 'low') {
    tier = 'medium';
    reasons.push(`Low activity consistency score (${activityScore})`);
  }

  if (reasons.length === 0) {
    reasons.push('All signals within normal range');
  }

  return {
    tier,
    premium: PREMIUM_BY_TIER[tier],
    reasons,
  };
};

module.exports = { calculateRiskScore, THRESHOLDS, PREMIUM_BY_TIER };