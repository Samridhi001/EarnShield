"""
Compare Logistic Regression against Random Forest to justify the final
model choice with evidence, not just convenience.
"""

import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

RANDOM_STATE = 42

def load_data():
    df = pd.read_csv('../data/synthetic_dataset.csv')
    X = df[['rainfallMm', 'temperatureC', 'aqi', 'activityScore']]
    y = df['riskTier']
    return X, y

def main():
    X, y = load_data()
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=RANDOM_STATE, stratify=y_encoded
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    results = []

    # --- Logistic Regression ---
    lr = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    lr.fit(X_train_scaled, y_train)
    lr_pred = lr.predict(X_test_scaled)
    lr_cv_scores = cross_val_score(lr, X_train_scaled, y_train, cv=5)

    results.append({
        'model': 'Logistic Regression',
        'test_accuracy': accuracy_score(y_test, lr_pred),
        'test_f1': f1_score(y_test, lr_pred, average='weighted'),
        'cv_mean_accuracy': lr_cv_scores.mean(),
        'cv_std': lr_cv_scores.std(),
    })

    # --- Random Forest ---
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=RANDOM_STATE)
    rf.fit(X_train_scaled, y_train)
    rf_pred = rf.predict(X_test_scaled)
    rf_cv_scores = cross_val_score(rf, X_train_scaled, y_train, cv=5)

    results.append({
        'model': 'Random Forest',
        'test_accuracy': accuracy_score(y_test, rf_pred),
        'test_f1': f1_score(y_test, rf_pred, average='weighted'),
        'cv_mean_accuracy': rf_cv_scores.mean(),
        'cv_std': rf_cv_scores.std(),
    })

    results_df = pd.DataFrame(results)
    print("=== Model Comparison ===")
    print(results_df.to_string(index=False))

    print("\n=== Random Forest Feature Importance ===")
    importance_df = pd.DataFrame({
        'feature': X.columns,
        'importance': rf.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importance_df.to_string(index=False))

    results_df.to_csv('../models/model_comparison.csv', index=False)
    print("\nSaved comparison to ../models/model_comparison.csv")

if __name__ == '__main__':
    main()