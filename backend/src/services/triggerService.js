const { getWeatherForZone } = require('./weatherService');

/**
 * Trigger Engine — evaluates environmental conditions against predefined
 * parametric thresholds and returns any triggers that fired.
 *
 * This is deliberately separate from the risk-scoring service: risk scoring
 * decides what a subscription COSTS (before the fact), while the trigger
 * engine decides what PAYS OUT (after the fact). Different questions,
 * different thresholds, different lifecycles.
 */

const TRIGGER_THRESHOLDS = {
  rainfall: { threshold: 50, unit: 'mm', payout: 200, comparison: 'gte' },
  temperature: { threshold: 45, unit: '°C', payout: 150, comparison: 'gte' },
  aqi: { threshold: 300, unit: 'AQI', payout: 180, comparison: 'gte' },
};

/**
 * Evaluates one set of conditions against all thresholds.
 * @param {Object} conditions - { rainfallMm, temperatureC, aqi }
 * @returns {Array} list of fired triggers
 */
const evaluateTriggers = (conditions) => {
  const { rainfallMm = 0, temperatureC = 0, aqi = 0 } = conditions;

  const valueMap = {
    rainfall: rainfallMm,
    temperature: temperatureC,
    aqi: aqi,
  };

  const firedTriggers = [];

  Object.entries(TRIGGER_THRESHOLDS).forEach(([triggerType, config]) => {
    const actualValue = valueMap[triggerType];
    const fired = config.comparison === 'gte'
      ? actualValue >= config.threshold
      : actualValue <= config.threshold;

    if (fired) {
      firedTriggers.push({
        triggerType,
        actualValue,
        threshold: config.threshold,
        unit: config.unit,
        payout: config.payout,
        reason: `${triggerType} at ${actualValue}${config.unit} exceeded threshold of ${config.threshold}${config.unit}`,
      });
    }
  });

  return firedTriggers;
};

/**
 * Fetches live weather for a zone and evaluates triggers against it.
 */
const evaluateZone = async (zone) => {
  const weather = await getWeatherForZone(zone);
  const firedTriggers = evaluateTriggers(weather);

  return {
    zone,
    conditions: weather,
    firedTriggers,
    anyTriggered: firedTriggers.length > 0,
    evaluatedAt: new Date(),
  };
};

module.exports = { evaluateTriggers, evaluateZone, TRIGGER_THRESHOLDS };