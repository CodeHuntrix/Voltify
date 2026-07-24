# ==============================================================================
# VOLTIFY AI Engine: Isolation Forest Meter Anomaly Detection
# Deterministic Unsupervised Anomaly Detection Pipeline (Zero-Variance & Severity Scoring)
# ==============================================================================

import os
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Set deterministic global seed
np.random.seed(42)

print("Scikit-Learn Isolation Forest Engine Initialized.")

# 1. Data Loading & Preprocessing
train_csv = "data/raw/meter_data.csv"
sample_csv = "meter_data.csv"

if os.path.exists(train_csv):
    df_raw_train = pd.read_csv(train_csv)
elif os.path.exists(sample_csv):
    df_raw_train = pd.read_csv(sample_csv)
else:
    df_raw_train = pd.read_csv("../meter_data.csv")

if os.path.exists(sample_csv):
    df_raw_sample = pd.read_csv(sample_csv)
else:
    df_raw_sample = pd.read_csv("../meter_data.csv")

print(f"Loaded {len(df_raw_train)} readings for training and {len(df_raw_sample)} readings for inference.")

def prepare_meter_features(df_raw):
    df = df_raw.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='mixed', errors='coerce')
    df = df.dropna(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
    
    df['hour_of_day'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    
    df['voltage_v'] = df['voltage_v'].astype(float).fillna(230.0)
    df['current_a'] = df['current_a'].astype(float).fillna(1.5)
    df['power_factor'] = df['power_factor'].astype(float).fillna(0.95)
    
    if 'cumulative_kwh' in df.columns:
        df['energy_delta_kwh'] = df['cumulative_kwh'].diff().fillna(0.0).clip(lower=0.0)
        df['active_power_kw'] = (df['voltage_v'] * df['current_a'] * df['power_factor']) / 1000.0
    else:
        df['active_power_kw'] = (df['voltage_v'] * df['current_a'] * df['power_factor']) / 1000.0
        df['energy_delta_kwh'] = df['active_power_kw'] * (5.0 / 60.0)
        
    return df

df_feat_train = prepare_meter_features(df_raw_train)
df_feat_sample = prepare_meter_features(df_raw_sample)

feature_cols = ['energy_delta_kwh', 'active_power_kw', 'current_a', 'voltage_v', 'power_factor']

# 2. Build & Fit Isolation Forest Anomaly Detection Model
contamination_rate = 0.03 # 3% anomaly contamination assumption
iso_model = IsolationForest(
    n_estimators=100,
    contamination=contamination_rate,
    random_state=42
)

print(f"\n>>> Training Isolation Forest Model (Contamination = {contamination_rate * 100:.1f}%)...")
X_train = df_feat_train[feature_cols].values
iso_model.fit(X_train)

# Save model artifact
joblib_path = "voltify_isolation_forest.joblib"
joblib.dump(iso_model, joblib_path)
print(f"[SUCCESS] Exported Isolation Forest Model to: {os.path.abspath(joblib_path)}")

# 3. Categorization & Severity Scoring Rule Engine
def categorize_anomaly(row: pd.Series, decision_score: float) -> tuple[str, str]:
    active_kw = float(row['active_power_kw'])
    hour = int(row['hour_of_day'])
    voltage = float(row['voltage_v'])
    pf = float(row['power_factor'])
    
    if voltage < 212.0 or voltage > 243.0 or pf < 0.82:
        anomaly_type = "Grid / Meter Abnormality"
        severity = "High" if voltage < 205.0 or pf < 0.78 else "Medium"
    elif (1 <= hour <= 4) and active_kw > 1.8:
        anomaly_type = "Unexpected Overnight Usage"
        severity = "High" if active_kw > 2.5 else "Medium"
    elif active_kw > 3.0:
        anomaly_type = "Sudden High Load Spike"
        severity = "Critical" if active_kw > 3.5 else "High"
    else:
        if decision_score < -0.15:
            severity = "Medium"
            anomaly_type = "Sustained High Consumption"
        else:
            severity = "Low"
            anomaly_type = "Minor Load Fluctuations"
            
    return anomaly_type, severity

# 4. Inference & Anomaly Detection Report
X_sample = df_feat_sample[feature_cols].values
preds = iso_model.predict(X_sample) # -1 for anomaly, 1 for normal
raw_scores = iso_model.decision_function(X_sample)

df_eval = df_feat_train.copy()
X_eval = df_eval[feature_cols].values
eval_preds = iso_model.predict(X_eval)
eval_scores = iso_model.decision_function(X_eval)

df_eval['is_anomaly'] = (eval_preds == -1).astype(int)
df_eval['decision_score'] = eval_scores

anomalies = []
for idx, row in df_eval.iterrows():
    if row['is_anomaly'] == 1:
        a_type, severity = categorize_anomaly(row, row['decision_score'])
        anomalies.append({
            "timestamp": str(row['timestamp']),
            "type": a_type,
            "severity": severity,
            "score": round(float(abs(row['decision_score'])), 4),
            "power_kw": round(float(row['active_power_kw']), 2),
            "voltage_v": round(float(row['voltage_v']), 1)
        })

df_anom = pd.DataFrame(anomalies)

print("==========================================================")
print("--- VOLTIFY Isolation Forest Anomaly Detection Report ---")
print("==========================================================")
print(f"  - Total Meter Samples Analyzed : {len(df_eval)}")
print(f"  - Contamination Rate                : {contamination_rate * 100:.1f}%")
print(f"  - Total Anomalies Detected          : {len(df_anom)}")

if not df_anom.empty:
    sev_counts = df_anom['severity'].value_counts().to_dict()
    print(f"  - Severity Breakdown:")
    for level in ['Critical', 'High', 'Medium', 'Low']:
        cnt = sev_counts.get(level, 0)
        print(f"      * {level:<8}: {cnt}")
    
    print("\n  - Top Detected Anomaly Sample Events:")
    for i, a in enumerate(anomalies[:5], 1):
        print(f"      {i}. [{a['timestamp']}] {a['type']} ({a['severity']} Severity)")
        print(f"         Power: {a['power_kw']} kW | Voltage: {a['voltage_v']} V | Anomaly Score: {a['score']}")
print("==========================================================")
