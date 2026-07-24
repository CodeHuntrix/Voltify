# Voltify AI Engine: Transformer-Based NILM Disaggregation

Voltify's core disaggregation system has been upgraded with a **Transformer-Based Non-Intrusive Load Monitoring (NILM)** model. The model learns individual appliance-level consumption patterns from aggregate meter readings (active power, voltage, current, and power factor).

---

## 🛠️ Architecture & Database Integration

The disaggregation model queries the database dynamically to fetch the user's configured appliances, compiling the neural network's output dimensions to match the registered appliance list.

### 1. Database Connection
The pipeline queries the database to match user profiles:
```sql
SELECT DISTINCT name FROM appliances;
```
This ensures the disaggregation targets and neural network outputs scale dynamically based on the exact user-registered profiles.

### 2. Transformer Attention Model
The model leverages a Multi-Head Attention Transformer sequence model to capture patterns across temporal intervals:

```mermaid
graph TD
    Input["Meter Readings Sequence (Seq Len: 12)<br>[voltage, current, power_factor, active_power, hour, day]"] --> DenseEmbed["Dense Embedding<br>(Dim: 64)"]
    DenseEmbed --> TransBlock1["Transformer Block 1<br>(Multi-Head Attention + FFN)"]
    TransBlock1 --> TransBlock2["Transformer Block 2<br>(Multi-Head Attention + FFN)"]
    TransBlock2 --> AvgPool["Global Average Pooling 1D"]
    AvgPool --> Dense64["Dense Layer (64, Relu)"]
    Dense64 --> Dense32["Dense Layer (32, Relu)"]
    Dense32 --> OutputHead["Softplus Output Head<br>(Dynamic Appliance Count)"]
```

---

## 📊 Training Run Logs & Proof of Work

Below is the verification of the model training run and inference report:

![Training Epochs Part 1](images/training_run_part1.jpg)
![Training Epochs Part 2](images/training_run_part2.jpg)

---

## 📈 Key Advantages of NILM over Rule-Based Systems

1. **Non-Intrusive disaggregation**: Learns patterns of active load states rather than relying on strict, static hour thresholds.
2. **Context-Aware**: Recognizes reactive signatures via changes in the voltage-current relationship and power factor.
3. **Software-Driven scaling**: Operates directly on the aggregate meter output stream.
