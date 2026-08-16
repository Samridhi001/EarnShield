const { calculateRiskScore } = require('../riskScoringService');

describe('calculateRiskScore (rule-based)', () => {
  test('returns low tier for normal conditions', () => {
    const result = calculateRiskScore({ rainfallMm: 5, temperatureC: 28, aqi: 80, activityScore: 0.9 });
    expect(result.tier).toBe('low');
    expect(result.premium).toBe(20);
  });

  test('returns high tier when rainfall exceeds high threshold', () => {
    const result = calculateRiskScore({ rainfallMm: 60, temperatureC: 30, aqi: 90, activityScore: 0.8 });
    expect(result.tier).toBe('high');
    expect(result.premium).toBe(60);
  });

  test('returns high tier when temperature exceeds high threshold', () => {
    const result = calculateRiskScore({ rainfallMm: 0, temperatureC: 46, aqi: 100, activityScore: 0.9 });
    expect(result.tier).toBe('high');
  });

  test('returns medium tier for low activity score even with normal weather', () => {
    const result = calculateRiskScore({ rainfallMm: 5, temperatureC: 28, aqi: 80, activityScore: 0.2 });
    expect(result.tier).toBe('medium');
  });

  test('never returns a premium outside defined tiers', () => {
    const result = calculateRiskScore({ rainfallMm: 1000, temperatureC: 100, aqi: 1000, activityScore: 0 });
    expect([20, 40, 60]).toContain(result.premium);
  });
});