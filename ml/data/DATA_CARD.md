# EarnShield Synthetic Dataset — Data Card

## Purpose
Training data for the risk-tier classification model used in EarnShield's
premium scoring service. No public dataset exists linking gig-worker
activity, hyperlocal weather, and income-risk outcomes — this dataset is
synthetically generated to approximate realistic patterns for model
development and evaluation purposes.

## Generation Method
1. `generate_weather.py` — simulates 1 year of daily rainfall, temperature,
   and AQI for 5 zones using seasonal sinusoidal models with random noise,
   approximating known Indian seasonal weather patterns (monsoon rainfall
   peak, summer heat peak, winter AQI elevation).
2. `generate_dataset.py` — aggregates weather into weekly zone-level
   summaries, simulates 300 synthetic workers with individual activity
   reliability baselines, and assigns a ground-truth risk tier label using
   the same threshold rules as the production rule-based scorer, with 8%
   random label noise injected to simulate real-world label uncertainty.

## Schema
| Column | Type | Description |
|---|---|---|
| workerId | int | Synthetic worker identifier (0-299) |
| zone | string | One of 5 delivery zones |
| week | int | Week number (0-51) |
| rainfallMm | float | Weekly total rainfall |
| temperatureC | float | Weekly peak temperature |
| aqi | float | Weekly average AQI |
| activityScore | float | 0-1, worker activity consistency |
| riskTier | string | low / medium / high — the training label |

## Known Limitations (disclosed)
- Weather is synthetically modeled, not sourced from real historical
  records — the seasonal shape approximates known patterns but exact
  values are not real observations.
- Worker activity and its correlation with weather is simulated; real
  gig-worker behavioral data was not available for this project.
- Label noise (8%) is an assumption, not measured from real claims data.

## Intended Use
Model development, training, and evaluation for the EarnShield academic/
portfolio project. Not intended for production actuarial use.