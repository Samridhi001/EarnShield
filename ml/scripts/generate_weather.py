"""
Synthetic weather data generator for EarnShield.

METHODOLOGY & ASSUMPTIONS (documented for reproducibility):
- We simulate daily weather for 5 delivery zones over 1 year (365 days).
- Rainfall follows a seasonal monsoon pattern (higher June-September,
  matching the Indian monsoon season), modeled as a sinusoidal baseline
  plus random noise, floored at 0.
- Temperature follows a seasonal cycle (peak in May-June, matching Indian
  summer), sinusoidal baseline plus noise.
- AQI is modeled as inversely correlated with rainfall (rain clears
  pollution) and elevated in winter months (Oct-Jan), reflecting real
  patterns reported in Indian AQI studies for this reason.
- These are REALISTIC APPROXIMATIONS, not real historical records, since
  no public per-zone gig-economy dataset exists. This is disclosed
  explicitly in the project report.
"""

import numpy as np
import pandas as pd

np.random.seed(42)  # reproducibility — same output every time this runs

ZONES = ['Bhubaneswar-Zone1', 'Bhubaneswar-Zone2', 'Cuttack-Zone1', 'Rourkela-Zone1', 'Puri-Zone1']
DAYS_IN_YEAR = 365

def generate_weather_for_zone(zone_name, zone_offset):
    """Generate one year of daily weather for a single zone."""
    days = np.arange(DAYS_IN_YEAR)

    rainfall_seasonal = 40 * np.sin((days - 150) * (2 * np.pi / 365)) 
    rainfall_seasonal = np.clip(rainfall_seasonal, 0, None)
    rainfall_noise = np.random.exponential(scale=8, size=DAYS_IN_YEAR)
    rainfall = np.clip(rainfall_seasonal + rainfall_noise + zone_offset, 0, None)

    temp_seasonal = 30 + 10 * np.sin((days - 90) * (2 * np.pi / 365))
    temp_noise = np.random.normal(0, 2, DAYS_IN_YEAR)
    temperature = temp_seasonal + temp_noise

    winter_boost = np.where((days > 270) | (days < 30), 80, 0)
    aqi_base = 120 - (rainfall * 0.8) + winter_boost
    aqi_noise = np.random.normal(0, 15, DAYS_IN_YEAR)
    aqi = np.clip(aqi_base + aqi_noise, 10, None)

    return pd.DataFrame({
        'zone': zone_name,
        'day': days,
        'rainfallMm': np.round(rainfall, 1),
        'temperatureC': np.round(temperature, 1),
        'aqi': np.round(aqi, 0).astype(int),
    })

def generate_all_weather():
    zone_offsets = {
        'Bhubaneswar-Zone1': 0,
        'Bhubaneswar-Zone2': 2,
        'Cuttack-Zone1': -3,
        'Rourkela-Zone1': -8,
        'Puri-Zone1': 6,
    }
    all_data = [generate_weather_for_zone(zone, offset) for zone, offset in zone_offsets.items()]
    return pd.concat(all_data, ignore_index=True)

if __name__ == '__main__':
    df = generate_all_weather()
    output_path = '../data/weather_raw.csv'
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} weather records across {len(ZONES)} zones")
    print(df.head(10))
    print(f"\nSaved to {output_path}")