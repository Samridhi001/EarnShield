"""Quick exploratory check on the generated dataset — sanity check before training."""

import pandas as pd

df = pd.read_csv('../data/synthetic_dataset.csv')

print("=== Dataset shape ===")
print(df.shape)

print("\n=== Class balance ===")
print(df['riskTier'].value_counts(normalize=True).round(3))

print("\n=== Numeric feature summary ===")
print(df[['rainfallMm', 'temperatureC', 'aqi', 'activityScore']].describe())

print("\n=== Missing values check ===")
print(df.isnull().sum())

print("\n=== Records per zone ===")
print(df['zone'].value_counts())