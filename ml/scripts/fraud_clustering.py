"""
Fraud ring detection via DBSCAN clustering.

METHODOLOGY:
- Simulates a mix of normal claims (scattered across a zone) and a
  coordinated fraud ring (multiple claims clustered tightly in space
  and time, simulating spoofed GPS + synchronized submission).
- DBSCAN groups points by density: a "cluster" is a region with many
  points close together; isolated points are labeled as noise (-1).
- Features used for clustering: lat, lng, and claim submission time
  (converted to minutes-since-epoch, scaled), so clusters must be close
  in BOTH space AND time to be flagged — a ring making claims from
  slightly different, spread-out times shouldn't trigger.

WHY DBSCAN over k-means: k-means requires specifying the number of
clusters in advance, which we don't know (fraud rings aren't a fixed
count). DBSCAN discovers dense regions automatically and correctly
treats scattered legitimate claims as noise instead of forcing them
into a cluster.
"""

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

np.random.seed(42)

def generate_synthetic_claims():
    records = []

    # 50 normal, scattered claims across Bhubaneswar-Zone1 bounding box
    for i in range(50):
        lat = np.random.uniform(20.20, 20.35)
        lng = np.random.uniform(85.75, 85.90)
        minutes = np.random.uniform(0, 1440)  # scattered across a full day
        records.append({'claimId': f'normal_{i}', 'lat': lat, 'lng': lng, 'minutesSinceMidnight': minutes, 'isFraudRing': False})

    # 12 fraud ring claims — tightly clustered in space and time
    # (simulating spoofed GPS near one point, submitted within a narrow window)
    ring_lat, ring_lng = 20.27, 85.84
    ring_time = 600  # 10:00 AM
    for i in range(12):
        lat = ring_lat + np.random.normal(0, 0.001)  # tiny spread — ~100m
        lng = ring_lng + np.random.normal(0, 0.001)
        minutes = ring_time + np.random.normal(0, 3)  # within ~3 minutes of each other
        records.append({'claimId': f'ring_{i}', 'lat': lat, 'lng': lng, 'minutesSinceMidnight': minutes, 'isFraudRing': True})

    return pd.DataFrame(records)

def detect_fraud_rings(df, eps=0.5, min_samples=4):
    """
    eps: max distance between points to be considered neighbors (after scaling)
    min_samples: minimum points required to form a dense cluster
    """
    features = df[['lat', 'lng', 'minutesSinceMidnight']].copy()

    # Scale so lat/lng (small numeric range) and time (large range) contribute fairly
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    cluster_labels = dbscan.fit_predict(features_scaled)

    df = df.copy()
    df['cluster'] = cluster_labels
    df['flaggedAsRing'] = cluster_labels != -1  # -1 means "noise" (not part of any dense cluster)

    return df

if __name__ == '__main__':
    df = generate_synthetic_claims()
    result = detect_fraud_rings(df)

    print("=== Clustering Results ===")
    print(result[['claimId', 'cluster', 'flaggedAsRing', 'isFraudRing']].to_string(index=False))

    print("\n=== Evaluation ===")
    true_positives = ((result['flaggedAsRing'] == True) & (result['isFraudRing'] == True)).sum()
    false_positives = ((result['flaggedAsRing'] == True) & (result['isFraudRing'] == False)).sum()
    false_negatives = ((result['flaggedAsRing'] == False) & (result['isFraudRing'] == True)).sum()
    true_negatives = ((result['flaggedAsRing'] == False) & (result['isFraudRing'] == False)).sum()

    print(f"True Positives (correctly flagged ring claims):  {true_positives}")
    print(f"False Positives (legit claims wrongly flagged):  {false_positives}")
    print(f"False Negatives (ring claims missed):             {false_negatives}")
    print(f"True Negatives (legit claims correctly cleared):  {true_negatives}")

    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
    print(f"\nPrecision: {precision:.2f}")
    print(f"Recall:    {recall:.2f}")