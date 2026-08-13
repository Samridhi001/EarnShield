"""
Train and evaluate risk-tier classification models.

Features used: rainfallMm, temperatureC, aqi, activityScore
Target: riskTier (low / medium / high)

We deliberately EXCLUDE workerId, zone, and week as direct features —
workerId would let the model memorize specific workers (data leakage,
not generalizable), and zone/week are proxies already captured by the
weather values themselves.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report
)
import joblib

RANDOM_STATE = 42

def load_data():
    df = pd.read_csv('../data/synthetic_dataset.csv')
    features = df[['rainfallMm', 'temperatureC', 'aqi', 'activityScore']]
    target = df['riskTier']
    return features, target

def main():
    X, y = load_data()

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    print(f"Label mapping: {dict(zip(label_encoder.classes_, label_encoder.transform(label_encoder.classes_)))}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=RANDOM_STATE, stratify=y_encoded
    )
    print(f"\nTrain set: {X_train.shape[0]} records | Test set: {X_test.shape[0]} records")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)

    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')

    print(f"\n=== Logistic Regression — Test Set Performance ===")
    print(f"Accuracy:  {accuracy:.3f}")
    print(f"Precision: {precision:.3f}")
    print(f"Recall:    {recall:.3f}")
    print(f"F1 Score:  {f1:.3f}")

    print(f"\n=== Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

    print(f"\n=== Confusion Matrix ===")
    print("Rows = actual, Columns = predicted")
    print(f"Classes order: {list(label_encoder.classes_)}")
    print(confusion_matrix(y_test, y_pred))

    joblib.dump(model, '../models/logistic_regression.pkl')
    joblib.dump(scaler, '../models/scaler.pkl')
    joblib.dump(label_encoder, '../models/label_encoder.pkl')
    print(f"\nModel artifacts saved to ../models/")

if __name__ == '__main__':
    main()