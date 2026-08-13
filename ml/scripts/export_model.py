"""
Export the trained Logistic Regression model's parameters to JSON so the
Node.js backend can perform inference without needing a Python runtime.

Logistic regression prediction is just:
  1. Scale inputs: (x - mean) / std   [from StandardScaler]
  2. Compute: scores = weights . scaled_x + intercepts   [per class]
  3. Softmax the scores to get probabilities
  4. Pick the class with highest probability

All of this is exportable as plain numbers — no special ML library
needed on the Node side.
"""

import json
import joblib
import numpy as np

def export():
    model = joblib.load('../models/logistic_regression.pkl')
    scaler = joblib.load('../models/scaler.pkl')
    label_encoder = joblib.load('../models/label_encoder.pkl')

    export_data = {
        'featureNames': ['rainfallMm', 'temperatureC', 'aqi', 'activityScore'],
        'classes': label_encoder.classes_.tolist(),  # e.g. ['high', 'low', 'medium']
        'scaler': {
            'mean': scaler.mean_.tolist(),
            'scale': scaler.scale_.tolist(),
        },
        'model': {
            'coefficients': model.coef_.tolist(),  # shape: [n_classes, n_features]
            'intercepts': model.intercept_.tolist(),  # shape: [n_classes]
        },
        'metadata': {
            'algorithm': 'multinomial_logistic_regression',
            'trainedOn': 'synthetic_dataset.csv (15600 records)',
            'note': 'Deployed for simplicity/interpretability; see model_comparison.csv for Random Forest benchmark.',
        }
    }

    output_path = '../models/risk_model_export.json'
    with open(output_path, 'w') as f:
        json.dump(export_data, f, indent=2)

    print(f"Model exported to {output_path}")
    print(f"Classes: {export_data['classes']}")
    print(f"Coefficient matrix shape: {np.array(export_data['model']['coefficients']).shape}")

if __name__ == '__main__':
    export()