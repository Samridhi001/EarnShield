"""
Full synthetic dataset generator — combines weather with simulated worker
activity and produces a labeled risk tier for each (worker, week) record.

METHODOLOGY & ASSUMPTIONS:
- 300 synthetic workers are distributed across the 5 zones.
- Each worker has a weekly "activityScore" (0-1) representing consistency
  of logins/deliveries, modeled with individual variation (some workers are
  reliably active, some inconsistent) using a Beta distribution.
- The GROUND TRUTH risk tier label is generated using the same threshold
  logic as our rule-based service (documented in riskScoringService.js),
  PLUS 8% random label noise — meaning 8% of records are deliberately
  mislabeled to simulate real-world uncertainty (e.g. a claim was approved
  or rejected for reasons beyond the pure formula, like manual review
  edge cases). This noise is what makes training an ML model meaningful:
  a lookup table could perfectly encode noise-free rules, but a model
  needs to learn to generalize past the noise, which is the actual
  point of this project component.
- This produces a dataset that is realistic-shaped but explicitly
  synthetic; this limitation is documented in the final project report.
"""

import numpy as np
import pandas as pd

np.random.seed(42)

N_WORKERS = 300
ZONES = ['Bhubaneswar-Zone1', 'Bhubaneswar-Zone2', 'Cuttack-Zone1', 'Rourkela-Zone1', 'Puri-Zone1']

RAIN_MED, RAIN_HIGH = 20, 50
TEMP_MED, TEMP_HIGH = 38, 45
AQI_MED, AQI_HIGH = 150, 300

def true_tier(rainfall, temperature, aqi, activity):
    tier = 'low'
    if rainfall >= RAIN_HIGH or temperature >= TEMP_HIGH or aqi >= AQI_HIGH:
        tier = 'high'
    elif rainfall >= RAIN_MED or temperature >= TEMP_MED or aqi >= AQI_MED:
        tier = 'medium'
    if activity < 0.4 and tier == 'low':
        tier = 'medium'
    return tier

def generate_dataset():
    weather = pd.read_csv('../data/weather_raw.csv')
    weather['week'] = weather['day'] // 7
    weekly_weather = weather.groupby(['zone', 'week']).agg(
        rainfallMm=('rainfallMm', 'sum'),
        temperatureC=('temperatureC', 'max'),
        aqi=('aqi', 'mean'),
    ).reset_index()

    records = []
    worker_zone = np.random.choice(ZONES, size=N_WORKERS)
    worker_reliability = np.random.beta(a=6, b=2, size=N_WORKERS)

    for worker_id in range(N_WORKERS):
        zone = worker_zone[worker_id]
        base_reliability = worker_reliability[worker_id]
        zone_weeks = weekly_weather[weekly_weather['zone'] == zone]

        for _, row in zone_weeks.iterrows():
            activity_score = np.clip(np.random.normal(base_reliability, 0.1), 0, 1)
            label = true_tier(row['rainfallMm'], row['temperatureC'], row['aqi'], activity_score)

            if np.random.rand() < 0.08:
                label = np.random.choice(['low', 'medium', 'high'])

            records.append({
                'workerId': worker_id,
                'zone': zone,
                'week': int(row['week']),
                'rainfallMm': round(row['rainfallMm'], 1),
                'temperatureC': round(row['temperatureC'], 1),
                'aqi': round(row['aqi'], 1),
                'activityScore': round(activity_score, 3),
                'riskTier': label,
            })

    return pd.DataFrame(records)

if __name__ == '__main__':
    df = generate_dataset()
    output_path = '../data/synthetic_dataset.csv'
    df.to_csv(output_path, index=False)

    print(f"Generated {len(df)} labeled records for {N_WORKERS} workers")
    print("\nClass distribution:")
    print(df['riskTier'].value_counts())
    print(f"\nSaved to {output_path}")
    print(df.head(10))