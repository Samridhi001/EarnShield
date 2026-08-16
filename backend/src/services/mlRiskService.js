const fs = require('fs');
const path = require('path');

// Load the exported model once at startup, not on every request
const modelPath = path.join(__dirname, '../config/riskModel.json');
const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));

const { featureNames, classes, scaler, model } = modelData;

/**
 * Scale raw input using the same StandardScaler parameters computed during
 * training: (x - mean) / std
 */
const scaleFeatures = (rawFeatures) => {
  return rawFeatures.map((value, i) => (value - scaler.mean[i]) / scaler.scale[i]);
};

/**
 * Softmax: converts raw class scores into probabilities that sum to 1.
 */
const softmax = (scores) => {
  const maxScore = Math.max(...scores);
  const expScores = scores.map((s) => Math.exp(s - maxScore)); // subtract max for numerical stability
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map((e) => e / sumExp);
};

/**
 * Predicts risk tier using the exported logistic regression parameters.
 * @param {Object} input - { rainfallMm, temperatureC, aqi, activityScore }
 * @returns {{ tier: string, probabilities: Object, confidence: number }}
 */
const predictRiskTier = (input) => {
  const rawFeatures = featureNames.map((name) => input[name]);
  const scaledFeatures = scaleFeatures(rawFeatures);

  const scores = model.coefficients.map((classCoefficients, classIdx) => {
    const dotProduct = classCoefficients.reduce(
      (sum, coef, featureIdx) => sum + coef * scaledFeatures[featureIdx],
      0
    );
    return dotProduct + model.intercepts[classIdx];
  });

  const probabilities = softmax(scores);

  const maxProbIdx = probabilities.indexOf(Math.max(...probabilities));
  const predictedTier = classes[maxProbIdx];
  const confidence = probabilities[maxProbIdx];

  const probabilitiesByClass = {};
  classes.forEach((cls, idx) => {
    probabilitiesByClass[cls] = Number(probabilities[idx].toFixed(4));
  });

  return {
    tier: predictedTier,
    probabilities: probabilitiesByClass,
    confidence: Number(confidence.toFixed(4)),
  };
};

module.exports = { predictRiskTier };