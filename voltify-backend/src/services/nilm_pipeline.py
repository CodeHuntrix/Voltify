# ==============================================================================
# VOLTIFY AI Engine: Transformer-Based NILM Appliance Disaggregation
# Deterministic & Stabilized Transformer Pipeline (Zero-Variance & Minimized MAE)
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

# 1. Database Load & Preprocessing
def load_appliances_from_db():
    default_appliances = ['AC', 'Fridge', 'Fan', 'TV', 'WashingMachine', 'Geyser', 'Others']
    
    db_url = None
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.strip().split("=")[1].strip("'\"")
                    break
    
    if not db_url:
        print("DATABASE_URL not found in .env, using default appliances.")
        return default_appliances
        
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT name FROM appliances")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        if rows:
            apps = [r[0] for r in rows]
            if 'Others' not in apps:
                apps.append('Others')
            print(f"Loaded appliances from database: {apps}")
            return apps
    except Exception as e:
        print(f"Failed to query database ({e}). Using default appliances instead.")
        
    return default_appliances

appliance_names = load_appliances_from_db()
num_appliances = len(appliance_names)

train_csv = "data/raw/meter_30days.csv"
data_csv = "meter_data.csv"

# Load rich training dataset if available, otherwise data CSV
if os.path.exists(train_csv):
    df_raw_train = pd.read_csv(train_csv)
else:
    df_raw_train = pd.read_csv(data_csv)

df_raw_data = pd.read_csv(data_csv)
print(f"Loaded {len(df_raw_train)} readings for training and {len(df_raw_data)} readings for inference.")

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
df_feat_data = prepare_meter_features(df_raw_data)

feature_cols = ['voltage_v', 'current_a', 'power_factor', 'active_power_kw', 'hour_of_day', 'day_of_week']

# 2. Sequence Generator & Physics Signature Targets
def prepare_sequences(df_features, seq_len=12):
    raw_feat = df_features[feature_cols].values
    interval_hours = 5.0 / 60.0
    
    targets = np.zeros((len(df_features), num_appliances))
    for idx, row in df_features.iterrows():
        kw = float(row['active_power_kw'])
        hour = int(row['hour_of_day'])
        pf = float(row['power_factor'])
        
        total_w = kw * 1000.0
        rem_w = total_w
        
        # Physics signature estimation distributed over the selected number of output classes
        appliance_map = {}
        for app in appliance_names:
            appliance_map[app] = 0.0
            
        if 'Fan' in appliance_map:
            fan = min(rem_w * 0.7, 180.0 if (11 <= hour <= 17 or hour >= 22 or hour <= 7) else 70.0)
            appliance_map['Fan'] = fan
            rem_w -= fan
            
        if 'Fridge' in appliance_map:
            fridge = min(rem_w * 0.6, 150.0) if rem_w > 40.0 else 0.0
            appliance_map['Fridge'] = fridge
            rem_w -= fridge
            
        geyser, ac = 0.0, 0.0
        if rem_w >= 1200.0:
            if (6 <= hour <= 9) and pf >= 0.95 and 'Geyser' in appliance_map:
                geyser = min(rem_w, 2200.0)
                appliance_map['Geyser'] = geyser
                rem_w -= geyser
            elif 'AC' in appliance_map:
                ac = min(rem_w, 2000.0)
                appliance_map['AC'] = ac
                rem_w -= ac
                
        if 'WashingMachine' in appliance_map:
            wm = min(rem_w, 600.0) if rem_w >= 400.0 and (7 <= hour <= 12 or 16 <= hour <= 19) else 0.0
            appliance_map['WashingMachine'] = wm
            rem_w -= wm
            
        if 'TV' in appliance_map:
            tv = min(rem_w, 140.0) if rem_w >= 70.0 and (18 <= hour <= 23 or 12 <= hour <= 14) else 0.0
            appliance_map['TV'] = tv
            rem_w -= tv
            
        appliance_map['Others'] = max(0.0, rem_w)
        
        targets[idx] = [(appliance_map[app] / 1000.0) * interval_hours for app in appliance_names]
    
    if len(raw_feat) < seq_len:
        padded_feat = np.pad(raw_feat, ((0, seq_len - len(raw_feat)), (0, 0)), mode='edge')
        X_seq = np.array([padded_feat])
        y_seq = np.array([targets[-1]])
    else:
        X_seq, y_seq = [], []
        for i in range(len(raw_feat) - seq_len + 1):
            X_seq.append(raw_feat[i : i + seq_len])
            y_seq.append(targets[i + seq_len - 1])
        X_seq = np.array(X_seq)
        y_seq = np.array(y_seq)
        
    return X_seq, y_seq

X_train, y_train = prepare_sequences(df_feat_train, seq_len=12)
X_test, y_test = prepare_sequences(df_feat_data, seq_len=12)

print(f"Training Tensor Shape: X={X_train.shape}, y={y_train.shape}")

# 3. Keras Transformer Encoder Architecture (Stabilized Softplus Head)
class TransformerBlock(layers.Layer):
    def __init__(self, embed_dim=64, num_heads=4, ff_dim=128, rate=0.1, **kwargs):
        super(TransformerBlock, self).__init__(**kwargs)
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)
        self.ffn = keras.Sequential([
            layers.Dense(ff_dim, activation="relu"),
            layers.Dense(embed_dim),
        ])
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(rate)
        self.dropout2 = layers.Dropout(rate)

    def call(self, inputs, training=False):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)

def build_transformer_nilm_model(seq_len=12, feat_dim=6, num_outputs=7):
    inputs = keras.Input(shape=(seq_len, feat_dim), name="aggregate_meter_sequence")
    x = layers.Dense(64, activation="linear")(inputs)
    x = TransformerBlock(embed_dim=64, num_heads=4, ff_dim=128, rate=0.1)(x)
    x = TransformerBlock(embed_dim=64, num_heads=4, ff_dim=128, rate=0.1)(x)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(64, activation="relu")(x)
    x = layers.Dense(32, activation="relu")(x)
    outputs = layers.Dense(num_outputs, activation="softplus", name="appliance_kwh_outputs")(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs, name="VOLTIFY_Transformer_NILM")
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=0.002), loss="mse", metrics=["mae"])
    return model

transformer_nilm = build_transformer_nilm_model(seq_len=X_train.shape[1], feat_dim=X_train.shape[2], num_outputs=num_appliances)

# 4. Fit Transformer NILM Neural Network
print("\n>>> Fitting Transformer NILM Neural Network (Deterministic)...")
history = transformer_nilm.fit(X_train, y_train, epochs=20, batch_size=32, verbose=1)

# 5. Save Model to voltify_nilm_model.h5
h5_output_path = "voltify_nilm_model.h5"
transformer_nilm.save(h5_output_path)
print(f"\n[SUCCESS] Exported Transformer NILM Model to: {os.path.abspath(h5_output_path)}")

# 6. Disaggregation Inference Report (Energy Conservation Energy Scaling)
predictions_kwh = transformer_nilm.predict(X_test)
total_raw_pred = predictions_kwh.sum(axis=0)

# Apply Energy Conservation Normalization
total_consumed_kwh = float(df_feat_data['energy_delta_kwh'].sum())
if total_raw_pred.sum() > 0:
    scaled_appliance_kwh = (total_raw_pred / total_raw_pred.sum()) * total_consumed_kwh
else:
    scaled_appliance_kwh = total_raw_pred

print("\n==========================================================")
print("--- Transformer NILM Appliance Disaggregation Report ---")
print("==========================================================")
for app, kwh in zip(appliance_names, scaled_appliance_kwh):
    pct = (kwh / max(scaled_appliance_kwh.sum(), 1e-6)) * 100.0
    print(f"  • {app:<15}: {kwh:8.4f} kWh ({pct:5.1f}%)")
print("==========================================================")
