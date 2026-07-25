// ==============================================================================
// Voltify Backend: DISCOM API Proxy Service
// Bridges voltify-backend to the standalone Discom microservice (port 3001)
// ==============================================================================

const http = require('http');

const DISCOM_BASE = process.env.DISCOM_API_URL || 'http://localhost:3001';

/**
 * Generic HTTP GET helper for the DISCOM microservice.
 * Returns parsed JSON or throws.
 */
function discomGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${DISCOM_BASE}${path}`;
    http.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            const err = JSON.parse(raw || '{}');
            return reject(new Error(err.error || `DISCOM API error ${res.statusCode}`));
          }
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error('DISCOM API returned invalid JSON'));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`DISCOM API unreachable: ${err.message}`));
    });
  });
}

// ── Customer APIs ─────────────────────────────────────────────────────────────

/** Returns all mock customers */
async function getAllCustomers() {
  return discomGet('/customers');
}

/** Returns a single customer record by consumer_no */
async function getCustomerByConsumerNo(consumer_no) {
  return discomGet(`/customers/${consumer_no}`);
}

// ── Meter Telemetry APIs ──────────────────────────────────────────────────────

/** Latest 5-min smart meter reading */
async function getLatestReading(meter_no) {
  return discomGet(`/meters/${meter_no}/stream`);
}

/**
 * Historical 5-min readings (defaults to last 288 = 24 hours)
 * limit: number of 5-min intervals
 */
async function getReadingHistory(meter_no, limit = 288) {
  return discomGet(`/meters/${meter_no}/history?limit=${limit}`);
}

/** Daily aggregated consumption summaries */
async function getDailyHistory(meter_no, days = 30) {
  return discomGet(`/meters/${meter_no}/daily?days=${days}`);
}

/** Monthly aggregated consumption and bill estimates */
async function getMonthlyHistory(meter_no, months = 12) {
  return discomGet(`/meters/${meter_no}/monthly?months=${months}`);
}

/**
 * Convenience: resolve consumer_no → meter_no → fetch hourly buckets
 * Returns an array of { hour: "00:00", kw, kwh } objects for the last 24h
 */
async function getHourlyForConsumer(consumer_no) {
  const customer = await getCustomerByConsumerNo(consumer_no);
  const readings = await getReadingHistory(customer.meter_no, 288); // 24h of 5-min intervals
  
  // Bucket into hourly aggregates
  const hourMap = {};
  for (const r of readings) {
    const ts = new Date(r.timestamp);
    const hourKey = `${String(ts.getHours()).padStart(2, '0')}:00`;
    if (!hourMap[hourKey]) hourMap[hourKey] = { kw_sum: 0, count: 0, kwh_sum: 0 };
    const kw = (parseFloat(r.voltage_v) * parseFloat(r.current_a) * parseFloat(r.power_factor)) / 1000;
    hourMap[hourKey].kw_sum += kw;
    hourMap[hourKey].count += 1;
    hourMap[hourKey].kwh_sum += kw * (5 / 60);
  }

  const hourlyData = Object.entries(hourMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, stats]) => ({
      date: hour,
      label: hour,
      units: Math.round(stats.kwh_sum * 1000) / 1000,
      cost: Math.round(stats.kwh_sum * 8 * 100) / 100, // ₹8/kWh default
    }));

  return hourlyData;
}

/**
 * Get daily view for a smart meter user (last N days)
 */
async function getDailyForConsumer(consumer_no, days = 30) {
  const customer = await getCustomerByConsumerNo(consumer_no);
  const daily = await getDailyHistory(customer.meter_no, days);
  return daily.map(d => ({
    date: d.date,
    label: d.date,
    units: d.daily_kwh,
    cost: Math.round(d.daily_kwh * 8 * 100) / 100,
    peak_kw: d.peak_load_kw,
  }));
}

/**
 * Get weekly view for a smart meter user
 * Groups daily data into ISO week buckets
 */
async function getWeeklyForConsumer(consumer_no, weeks = 12) {
  const customer = await getCustomerByConsumerNo(consumer_no);
  const daily = await getDailyHistory(customer.meter_no, weeks * 7);
  
  const weekMap = {};
  for (const d of daily) {
    const dt = new Date(d.date);
    // Get start of week (Monday)
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(dt.setDate(diff));
    const weekKey = weekStart.toISOString().split('T')[0];
    if (!weekMap[weekKey]) weekMap[weekKey] = { kwh: 0, cost: 0 };
    weekMap[weekKey].kwh += d.daily_kwh;
    weekMap[weekKey].cost += d.daily_kwh * 8;
  }

  return Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, stats]) => {
      const d = new Date(weekStart);
      const label = `Wk ${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
      return {
        date: weekStart,
        label,
        units: Math.round(stats.kwh * 100) / 100,
        cost: Math.round(stats.cost * 100) / 100,
      };
    });
}

/**
 * Run Isolation Forest anomaly detection on DISCOM reading history
 * Returns flagged anomalies with severity scores
 * Uses heuristic detection (no Python subprocess in this file for simplicity)
 */
async function detectAnomalies(consumer_no) {
  const customer = await getCustomerByConsumerNo(consumer_no);
  const readings = await getReadingHistory(customer.meter_no, 576); // 48h of 5-min readings
  
  if (!readings || readings.length < 10) {
    return { anomalies: [], total_readings: 0, anomaly_rate: 0 };
  }

  // Compute mean & std of active power
  const powers = readings.map(r =>
    (parseFloat(r.voltage_v) * parseFloat(r.current_a) * parseFloat(r.power_factor)) / 1000
  );
  const mean = powers.reduce((s, v) => s + v, 0) / powers.length;
  const variance = powers.reduce((s, v) => s + (v - mean) ** 2, 0) / powers.length;
  const std = Math.sqrt(variance);

  // Flag readings > 2.5 std devs above mean as anomalies
  const anomalies = [];
  readings.forEach((r, i) => {
    const kw = powers[i];
    const zScore = std > 0 ? (kw - mean) / std : 0;
    if (Math.abs(zScore) > 2.5) {
      const severity = Math.abs(zScore) > 3.5 ? 'HIGH' : 'MEDIUM';
      anomalies.push({
        timestamp: r.timestamp,
        voltage_v: r.voltage_v,
        current_a: r.current_a,
        power_factor: r.power_factor,
        active_power_kw: Math.round(kw * 1000) / 1000,
        z_score: Math.round(zScore * 100) / 100,
        severity,
        description: zScore > 0
          ? `Unusual spike: ${Math.round(kw * 1000)}W detected (${Math.abs(Math.round(zScore * 10) / 10)}σ above average)`
          : `Unexpected voltage drop detected (${Math.abs(Math.round(zScore * 10) / 10)}σ below average)`,
      });
    }
  });

  return {
    meter_no: customer.meter_no,
    consumer_no,
    total_readings: readings.length,
    anomaly_count: anomalies.length,
    anomaly_rate: Math.round((anomalies.length / readings.length) * 1000) / 10,
    baseline_kw: Math.round(mean * 1000) / 1000,
    std_kw: Math.round(std * 1000) / 1000,
    anomalies: anomalies.slice(0, 10), // Return last 10 most recent
  };
}

module.exports = {
  getAllCustomers,
  getCustomerByConsumerNo,
  getLatestReading,
  getReadingHistory,
  getDailyHistory,
  getMonthlyHistory,
  getHourlyForConsumer,
  getDailyForConsumer,
  getWeeklyForConsumer,
  detectAnomalies,
};
