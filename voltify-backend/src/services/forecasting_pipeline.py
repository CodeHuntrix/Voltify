# ==============================================================================
# VOLTIFY AI Engine: LSTM-Based Load & Energy Forecasting
# Deterministic & Stabilized LSTM Sequential Pipeline (Zero-Variance & Minimized MAE)
# ==============================================================================

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd

import tensorflow as tf
tf.get_logger().setLevel('ERROR')

# Set deterministic global seeds to eliminate run-to-run variance
np.random.seed(42)
tf.keras.utils.set_random_seed(42)

from tensorflow import keras
from tensorflow.keras import layers

print(f"TensorFlow Version: {tf.__version__}")
print(f"GPU Available: {len(tf.config.list_physical_devices('GPU')) > 0}")

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

feature_cols = ['voltage_v', 'current_a', 'power_factor', 'active_power_kw', 'hour_of_day', 'day_of_week']

# 2. Sequential Window & Forecasting Target Preparation
def prepare_lstm_sequences(df_features, seq_len=12):
    raw_feat = df_features[feature_cols].values
    target_kwh = df_features['energy_delta_kwh'].values
    
    if len(raw_feat) < seq_len:
        padded_feat = np.pad(raw_feat, ((0, seq_len - len(raw_feat)), (0, 0)), mode='edge')
        X_seq = np.array([padded_feat])
        y_seq = np.array([target_kwh[-1]])
    else:
        X_seq, y_seq = [], []
        for i in range(len(raw_feat) - seq_len):
            X_seq.append(raw_feat[i : i + seq_len])
            y_seq.append(target_kwh[i + seq_len])
        X_seq = np.array(X_seq)
        y_seq = np.array(y_seq)
        
    return X_seq, y_seq

X_train, y_train = prepare_lstm_sequences(df_feat_train, seq_len=12)
X_test, y_test = prepare_lstm_sequences(df_feat_sample, seq_len=12)

print(f"Training Tensor Shape: X={X_train.shape}, y={y_train.shape}")

# 3. Keras Sequential LSTM Neural Network Architecture
def build_lstm_forecaster_model(seq_len=12, feat_dim=6):
    inputs = keras.Input(shape=(seq_len, feat_dim), name="meter_temporal_sequence")
    x = layers.LSTM(64, return_sequences=True, name="lstm_recurrent_layer_1")(inputs)
    x = layers.Dropout(0.1, name="dropout_1")(x)
    x = layers.LSTM(32, return_sequences=False, name="lstm_recurrent_layer_2")(x)
    x = layers.Dropout(0.1, name="dropout_2")(x)
    x = layers.Dense(32, activation="relu", name="dense_dense_1")(x)
    outputs = layers.Dense(1, activation="softplus", name="next_interval_kwh_output")(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs, name="VOLTIFY_LSTM_Load_Forecaster")
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=0.002), loss="mse", metrics=["mae"])
    return model

lstm_forecaster = build_lstm_forecaster_model(seq_len=X_train.shape[1], feat_dim=X_train.shape[2])
lstm_forecaster.summary()

# 4. Fit LSTM Forecasting Neural Network
print("\n>>> Fitting LSTM Load Forecasting Neural Network (Deterministic)...")
history = lstm_forecaster.fit(X_train, y_train, epochs=20, batch_size=32, verbose=1)

# 5. Save Model to voltify_lstm_model.h5
h5_output_path = "voltify_lstm_model.h5"
lstm_forecaster.save(h5_output_path)
print(f"\n[SUCCESS] Exported LSTM Forecaster Model to: {os.path.abspath(h5_output_path)}")

# 6. Load Forecasting & Indian DISCOM Billing Inference Report
predictions_step_kwh = lstm_forecaster.predict(X_test)
eval_loss, eval_mae = lstm_forecaster.evaluate(X_test, y_test, verbose=0)

# Forecast calculations
avg_predicted_step = float(np.mean(predictions_step_kwh))
next_hour_kwh = avg_predicted_step * 12.0 # 12 intervals of 5-mins in 1 hr
next_24h_kwh = avg_predicted_step * 288.0 # 288 intervals in 24 hrs
next_7d_kwh = next_24h_kwh * 7.0
month_end_kwh = next_24h_kwh * 30.0

# Indian DISCOM Slab Tariff Calculation
if month_end_kwh <= 100:
    base_bill = month_end_kwh * 4.50
elif month_end_kwh <= 300:
    base_bill = (100 * 4.50) + ((month_end_kwh - 100) * 7.00)
else:
    base_bill = (100 * 4.50) + (200 * 7.00) + ((month_end_kwh - 300) * 9.50)

estimated_monthly_bill_inr = round(base_bill + 150.0, 2) # Adding fixed monthly DISCOM charge

print("\n==========================================================")
print("--- VOLTIFY LSTM Load Forecasting & Billing Report ---")
print("==========================================================")
print(f"  • Next 1-Hour Energy Forecast  : {next_hour_kwh:8.4f} kWh")
print(f"  • Next 24-Hour Energy Forecast : {next_24h_kwh:8.4f} kWh")
print(f"  • Next 7-Day Energy Forecast   : {next_7d_kwh:8.4f} kWh")
print(f"  • Projected 30-Day Monthly Total: {month_end_kwh:8.4f} kWh")
print(f"  • Estimated Monthly DISCOM Bill: Rs. {estimated_monthly_bill_inr:8.2f} INR")
print(f"  • Model Test Evaluation Loss  : {eval_loss:8.6f} (MSE)")
print(f"  • Model Test Evaluation MAE   : {eval_mae:8.6f}")
print("==========================================================")
