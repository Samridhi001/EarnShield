const { predictRiskTier } = require('../mlRiskService');

describe('predictRiskTier (ML-based)', () => {
  test('returns a valid tier from the known classes', () => {
    const result = predictRiskTier({ rainfallMm: 5, temperatureC: 28, aqi: 80, activityScore: 0.9 });
    expect(['low', 'medium', 'high']).toContain(result.tier);
  });

  test('probabilities sum to approximately 1', () => {
    const result = predictRiskTier({ rainfallMm: 25, temperatureC: 35, aqi: 120, activityScore: 0.7 });
    const sum = Object.values(result.probabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  test('confidence score is between 0 and 1', () => {
    const result = predictRiskTier({ rainfallMm: 60, temperatureC: 30, aqi: 90, activityScore: 0.8 });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('extreme rainfall pushes prediction toward high risk', () => {
    const result = predictRiskTier({ rainfallMm: 90, temperatureC: 32, aqi: 100, activityScore: 0.8 });
    expect(result.tier).toBe('high');
  });
});