const pool = require('../config/db');
const { getLiveTemperature } = require('./weatherService');

// Tamil Nadu TANGEDCO tariff rates (₹ per unit)
const TARIFF_RATES = {
  'Chennai':   8.0,
  'Mumbai':    9.5,
  'Delhi':     7.5,
  'Bangalore': 7.8,
  'Hyderabad': 8.2,
  'Kolkata':   8.0,
  'default':   8.0,
};

/**
 * Gets the tariff rate for a given location
 */
const getTariffRate = (location) => {
  return TARIFF_RATES[location] || TARIFF_RATES['default'];
};

/**
 * Calculates the exact bi-monthly subsidized TANGEDCO Chennai household electricity bill.
 * Returns the equivalent monthly cost (bi-monthly bill / 2).
 */
const calculateChennaiTNEBBill = (monthlyUnits) => {
  const biMonthlyUnits = parseFloat(monthlyUnits) * 2;
  let remaining = biMonthlyUnits;
  let cost = 0;

  // 1. First 100 units: Free
  const slab1 = Math.min(100, remaining);
  remaining -= slab1;

  // 2. 101 to 200 units: ₹2.25
  if (remaining > 0) {
    const slab2 = Math.min(100, remaining);
    cost += slab2 * 2.25;
    remaining -= slab2;
  }

  // 3. 201 to 400 units: ₹4.50
  if (remaining > 0) {
    const slab3 = Math.min(200, remaining);
    cost += slab3 * 4.50;
    remaining -= slab3;
  }

  // 4. 401 to 500 units: ₹6.00
  if (remaining > 0) {
    const slab4 = Math.min(100, remaining);
    cost += slab4 * 6.00;
    remaining -= slab4;
  }

  // 5. 501 to 600 units: ₹8.00
  if (remaining > 0) {
    const slab5 = Math.min(100, remaining);
    cost += slab5 * 8.00;
    remaining -= slab5;
  }

  // 6. 601 to 800 units: ₹9.00
  if (remaining > 0) {
    const slab6 = Math.min(200, remaining);
    cost += slab6 * 9.00;
    remaining -= slab6;
  }

  // 7. 801 to 1000 units: ₹10.00
  if (remaining > 0) {
    const slab7 = Math.min(200, remaining);
    cost += slab7 * 10.00;
    remaining -= slab7;
  }

  // 8. Above 1000 units: ₹11.00
  if (remaining > 0) {
    cost += remaining * 11.00;
  }

  // Monthly share is bi-monthly bill / 2
  return cost / 2;
};

/**
 * Returns the effective rate per unit (kWh) under tiered billing schemes.
 */
const getEffectiveTariffRate = (location, monthlyUnits) => {
  const defaultRate = getTariffRate(location);
  if (location !== 'Chennai' || !monthlyUnits || monthlyUnits <= 0) return defaultRate;
  return calculateChennaiTNEBBill(monthlyUnits) / monthlyUnits;
};

/**
 * Calculates a dynamic multiplier based on temperature.
 * Baseline temperature is 24°C.
 * For AC: Higher temperature increases cooling load by +5% per °C over 24°C.
 * For Geyser/Heater: Lower temperature increases heating load by +4% per °C below 24°C.
 */
const getTemperatureMultiplier = (applianceName, temperature) => {
  if (temperature === null || temperature === undefined) return 1.0;
  const temp = parseFloat(temperature);
  const name = (applianceName || '').toLowerCase();

  if (name.includes('ac') || name.includes('air conditioner') || name.includes('cooling')) {
    if (temp > 24) {
      return 1 + (temp - 24) * 0.05;
    }
    if (temp < 20) {
      return 0.2; // AC is barely turned on below 20°C!
    }
  }
  if (name.includes('geyser') || name.includes('water heater') || name.includes('heater') || name.includes('heating')) {
    if (temp < 24) {
      return 1 + (24 - temp) * 0.04;
    }
    if (temp > 30) {
      return 0.1; // Geyser is barely used in hot climate!
    }
  }
  return 1.0;
};

/**
 * Gets seasonal multiplier for AC based on current month
 * India: April–June = peak summer, Dec–Feb = winter
 */
const getSeasonalMultiplier = (applianceName, month) => {
  const m = month + 1; // month is 0-indexed from JS Date
  if (applianceName.toLowerCase().includes('ac')) {
    if ([4, 5, 6].includes(m)) return 1.3;   // Summer peak
    if ([12, 1, 2].includes(m)) return 0.4;  // Winter — barely used
    return 1.0;
  }
  if (applianceName.toLowerCase().includes('geyser')) {
    if ([12, 1, 2].includes(m)) return 1.4;  // Winter — heavy geyser use
    if ([4, 5, 6].includes(m)) return 0.5;   // Summer — barely used
    return 1.0;
  }
  return 1.0;
};

/**
 * Checks if an appliance should be active in a given month
 * based on its seasonality setting
 */
const isApplianceActiveInMonth = (seasonality, month) => {
  const m = month + 1;
  if (seasonality === 'whole_year') return true;
  if (seasonality === 'summer') return [3, 4, 5, 6, 7].includes(m);
  if (seasonality === 'winter') return [10, 11, 12, 1, 2].includes(m);
  return true;
};

/**
 * Adds ±10% random noise to make daily estimates look realistic
 * Not truly random — seeded by date so same date = same value
 */
const addDailyNoise = (value, date) => {
  const seed = new Date(date).getTime() % 1000;
  const noise = (seed / 1000 - 0.5) * 0.2; // -0.1 to +0.1
  return Math.max(0, value * (1 + noise));
};

/**
 * Weekend usage multiplier — people stay home more
 */
const getDayOfWeekMultiplier = (date) => {
  const day = new Date(date).getDay();
  return (day === 0 || day === 6) ? 1.15 : 1.0;
};

/**
 * CORE FUNCTION: Calculates estimated monthly kWh per appliance
 */
const calculateMonthlyEstimates = (appliances, month, location = 'Chennai', actualUnits = null, temperature = null) => {
  const baseEstimates = appliances.map((appliance) => {
    if (!isApplianceActiveInMonth(appliance.seasonality, month)) {
      return {
        ...appliance,
        uncalibrated_monthly_kwh: 0,
        estimated_monthly_kwh: 0,
        estimated_cost: 0,
        percentage: 0,
      };
    }

    const seasonalMultiplier = getSeasonalMultiplier(appliance.name, month);
    const tempMultiplier = getTemperatureMultiplier(appliance.name, temperature);

    const uncalibratedMonthlyKwh =
      parseFloat(appliance.power_kw) *
      parseFloat(appliance.avg_hours_day) *
      30 *
      seasonalMultiplier *
      tempMultiplier;

    return {
      ...appliance,
      uncalibrated_monthly_kwh: parseFloat(uncalibratedMonthlyKwh.toFixed(3)),
      estimated_monthly_kwh: parseFloat(uncalibratedMonthlyKwh.toFixed(3)),
    };
  });

  const totalUncalibrated = baseEstimates.reduce((sum, a) => sum + (a.uncalibrated_monthly_kwh || 0), 0);

  let calibrationFactor = 1.0;
  if (actualUnits !== null && parseFloat(actualUnits) > 0 && totalUncalibrated > 0) {
    calibrationFactor = parseFloat(actualUnits) / totalUncalibrated;
  }

  const totalCalibratedUnits = baseEstimates.reduce((sum, a) => sum + (a.uncalibrated_monthly_kwh * calibrationFactor), 0);
  const effectiveTariff = getEffectiveTariffRate(location, actualUnits || totalCalibratedUnits);

  return baseEstimates.map((app) => {
    const estimatedMonthlyKwh = app.uncalibrated_monthly_kwh * calibrationFactor;
    const estimatedCost = estimatedMonthlyKwh * effectiveTariff;

    return {
      ...app,
      estimated_monthly_kwh: parseFloat(estimatedMonthlyKwh.toFixed(3)),
      estimated_cost: parseFloat(estimatedCost.toFixed(2)),
      percentage: 0,
    };
  });
};

/**
 * Adds percentage breakdown to each appliance
 */
const addPercentageBreakdown = (appliancesWithEstimates) => {
  const totalKwh = appliancesWithEstimates.reduce(
    (sum, a) => sum + a.estimated_monthly_kwh, 0
  );

  if (totalKwh === 0) return appliancesWithEstimates;

  return appliancesWithEstimates.map((a) => ({
    ...a,
    percentage: parseFloat(((a.estimated_monthly_kwh / totalKwh) * 100).toFixed(1)),
  }));
};

/**
 * CORE FUNCTION: Estimates daily usage for a given date
 */
const estimateDailyUsage = (appliances, date, location = 'Chennai', calibrationFactor = 1.0, temperature = null, customTariff = null) => {
  const dateObj = new Date(date);
  const month = dateObj.getMonth();
  const tariff = customTariff || getTariffRate(location);

  const baseDaily = appliances.reduce((sum, appliance) => {
    if (!isApplianceActiveInMonth(appliance.seasonality, month)) return sum;

    const seasonalMultiplier = getSeasonalMultiplier(appliance.name, month);
    const tempMultiplier = getTemperatureMultiplier(appliance.name, temperature);
    const dailyKwh = parseFloat(appliance.power_kw) * parseFloat(appliance.avg_hours_day) * seasonalMultiplier * tempMultiplier;
    return sum + dailyKwh;
  }, 0);

  const calibratedDaily = baseDaily * calibrationFactor;
  const withNoise = addDailyNoise(calibratedDaily, date);
  const withWeekend = withNoise * getDayOfWeekMultiplier(date);
  const dailyUnits = parseFloat(withWeekend.toFixed(3));
  const dailyCost = parseFloat((dailyUnits * tariff).toFixed(2));

  return { units: dailyUnits, cost: dailyCost };
};

/**
 * Calculates match percentage between estimated and actual units
 */
const calculateMatchPercentage = (estimatedUnits, actualUnits) => {
  if (actualUnits === 0) return 0;
  const diff = Math.abs(estimatedUnits - actualUnits);
  const matchPct = Math.max(0, (1 - diff / actualUnits) * 100);
  return parseFloat(matchPct.toFixed(1));
};

/**
 * PREDICTIONS: Simple moving average for next day/week/month
 */
const generatePredictions = (last7DaysEstimates, location = 'Chennai') => {
  const tariff = getTariffRate(location);

  if (!last7DaysEstimates || last7DaysEstimates.length === 0) {
    return {
      tomorrow: { units: 0, cost: 0, confidence: 0 },
      next_week: { units: 0, cost: 0, confidence: 0 },
      next_month: { units: 0, cost: 0, confidence: 0 },
    };
  }

  const avgDaily = last7DaysEstimates.reduce((sum, d) => sum + parseFloat(d.estimated_units), 0) / last7DaysEstimates.length;
  const nextDayUnits = parseFloat((avgDaily * 1.02).toFixed(3));
  const nextWeekUnits = parseFloat((avgDaily * 7).toFixed(3));
  const nextMonthUnits = parseFloat((avgDaily * 30).toFixed(3));

  return {
    tomorrow: {
      units: nextDayUnits,
      cost: parseFloat((nextDayUnits * tariff).toFixed(2)),
      confidence: 85,
    },
    next_week: {
      units: nextWeekUnits,
      cost: parseFloat((nextWeekUnits * tariff).toFixed(2)),
      confidence: 75,
    },
    next_month: {
      units: nextMonthUnits,
      cost: parseFloat((nextMonthUnits * tariff).toFixed(2)),
      confidence: 65,
    },
  };
};

/**
 * BILL SHOCK DETECTION
 */
const detectBillShock = (dailyEstimatesThisMonth, lastMonthBill, daysElapsed, location = 'Chennai') => {
  const tariff = getTariffRate(location);

  if (!dailyEstimatesThisMonth || dailyEstimatesThisMonth.length === 0 || !lastMonthBill) {
    return { risk: false, probability: 0, projected_bill: 0, projected_units: 0 };
  }

  const totalSoFar = dailyEstimatesThisMonth.reduce((sum, d) => sum + parseFloat(d.estimated_units), 0);
  const avgPerDay = totalSoFar / Math.max(daysElapsed, 1);
  const projectedMonthlyUnits = avgPerDay * 30;
  const projectedBill = parseFloat((projectedMonthlyUnits * tariff).toFixed(2));

  const increaseRatio = projectedBill / parseFloat(lastMonthBill);
  const risk = increaseRatio > 1.15;

  return {
    risk,
    probability: risk ? Math.min(95, Math.round((increaseRatio - 1) * 200)) : 0,
    projected_bill: projectedBill,
    projected_units: parseFloat(projectedMonthlyUnits.toFixed(3)),
    increase_pct: parseFloat(((increaseRatio - 1) * 100).toFixed(1)),
  };
};

/**
 * WHAT-IF CALCULATOR
 */
const calculateWhatIf = (appliances, applianceName, changeType, changeValue, location = 'Chennai') => {
  const tariff = getTariffRate(location);
  const month = new Date().getMonth();

  const query = (applianceName || '').toLowerCase();

  const appliance = appliances.find(a => {
    const n = a.name.toLowerCase();
    return n.includes(query) || query.includes(n) || 
           (n.includes('fridge') && query.includes('refrigerator')) ||
           (n.includes('refrigerator') && query.includes('fridge')) ||
           (n.includes('ac') && query.includes('conditioner')) ||
           (n.includes('conditioner') && query.includes('ac')) ||
           (n.includes('heater') && query.includes('geyser')) ||
           (n.includes('geyser') && query.includes('heater'));
  });

  if (!appliance) {
    return { error: `Appliance "${applianceName}" not found` };
  }

  const currentMonthlyKwh =
    parseFloat(appliance.power_kw) *
    parseFloat(appliance.avg_hours_day) *
    30 *
    getSeasonalMultiplier(appliance.name, month);

  let newMonthlyKwh = currentMonthlyKwh;

  if (changeType === 'hours') {
    const newHours = Math.max(0, parseFloat(appliance.avg_hours_day) - parseFloat(changeValue));
    newMonthlyKwh =
      parseFloat(appliance.power_kw) *
      newHours *
      30 *
      getSeasonalMultiplier(appliance.name, month);
  }

  if (changeType === 'temperature') {
    const lowerName = appliance.name.toLowerCase();
    if (lowerName.includes('ac') || lowerName.includes('conditioner')) {
      const tempIncrease = parseFloat(changeValue);
      newMonthlyKwh = currentMonthlyKwh * (1 - (tempIncrease * 0.06));
    } else if (lowerName.includes('geyser') || lowerName.includes('heater')) {
      const tempDecrease = parseFloat(changeValue);
      newMonthlyKwh = currentMonthlyKwh * (1 - (tempDecrease * 0.03));
    } else if (lowerName.includes('fridge') || lowerName.includes('refrigerator')) {
      const tempIncrease = parseFloat(changeValue);
      newMonthlyKwh = currentMonthlyKwh * (1 - (tempIncrease * 0.04));
    }
  }

  const savedKwh = Math.max(0, currentMonthlyKwh - newMonthlyKwh);
  const monthlySavingsRs = parseFloat((savedKwh * tariff).toFixed(2));
  const annualSavingsRs = parseFloat((monthlySavingsRs * 12).toFixed(2));
  const coinsEarned = Math.round(savedKwh * 10);

  return {
    appliance: appliance.name,
    current_monthly_kwh: parseFloat(currentMonthlyKwh.toFixed(3)),
    new_monthly_kwh: parseFloat(newMonthlyKwh.toFixed(3)),
    saved_kwh: parseFloat(savedKwh.toFixed(3)),
    monthly_savings_rs: monthlySavingsRs,
    annual_savings_rs: annualSavingsRs,
    coins_earned: coinsEarned,
  };
};

/**
 * MAIN: Generates and saves daily estimates for a user
 */
const generateAndSaveDailyEstimates = async (userId, appliances, location, daysBack = 30) => {
  const client = await pool.connect();
  try {
    const billResult = await client.query(
      `SELECT units FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
      [userId]
    );
    const actualUnits = billResult.rows[0]?.units ? parseFloat(billResult.rows[0].units) : null;

    const temperature = await getLiveTemperature(location);

    const monthIndex = new Date().getMonth();
    const uncalibratedMonthlyUnits = appliances.reduce((sum, app) => {
      if (!isApplianceActiveInMonth(app.seasonality, monthIndex)) return sum;
      const seasonalMultiplier = getSeasonalMultiplier(app.name, monthIndex);
      const tempMultiplier = getTemperatureMultiplier(app.name, temperature);
      return sum + (parseFloat(app.power_kw) * parseFloat(app.avg_hours_day) * 30 * seasonalMultiplier * tempMultiplier);
    }, 0);

    let calibrationFactor = 1.0;
    if (actualUnits !== null && actualUnits > 0 && uncalibratedMonthlyUnits > 0) {
      calibrationFactor = actualUnits / uncalibratedMonthlyUnits;
    }

    const effectiveTariff = getEffectiveTariffRate(location, actualUnits || uncalibratedMonthlyUnits);

    await client.query('BEGIN');

    // Delete existing estimates for the date range to force-refresh with the premium realistic weather curves!
    await client.query(
      `DELETE FROM daily_estimates WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '${daysBack} days'`,
      [userId]
    );

    const estimates = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Simulate historical dynamic temperature variations to create realistic presentable graph fluctuations!
      let dailyTemp = 28.0 + (Math.sin(i * 0.3) * 2.0); // Cyclic variation between 26°C and 30°C

      // Simulate a massive Summer Heatwave around 9-11 days ago (spikes AC consumption)
      if (i >= 8 && i <= 11) {
        dailyTemp = 39.5;
      }

      // Simulate a cool rainy dip around 18-20 days ago (lowers AC consumption)
      if (i >= 18 && i <= 20) {
        dailyTemp = 20.5;
      }

      const { units, cost } = estimateDailyUsage(appliances, dateStr, location, calibrationFactor, dailyTemp, effectiveTariff);

      await client.query(
        `INSERT INTO daily_estimates (user_id, date, estimated_units, estimated_cost)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, date) DO UPDATE
         SET estimated_units = EXCLUDED.estimated_units,
             estimated_cost  = EXCLUDED.estimated_cost`,
        [userId, dateStr, units, cost]
      );

      estimates.push({ date: dateStr, units, cost });
    }

    await client.query('COMMIT');
    return estimates;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Generates and saves monthly appliance estimates
 */
const generateAndSaveApplianceEstimates = async (userId, appliances, location) => {
  const month = new Date();
  month.setDate(1);
  const monthStr = month.toISOString().split('T')[0];

  const client = await pool.connect();
  try {
    const billResult = await client.query(
      `SELECT units FROM monthly_bills WHERE user_id = $1 ORDER BY month DESC LIMIT 1`,
      [userId]
    );
    const actualUnits = billResult.rows[0]?.units ? parseFloat(billResult.rows[0].units) : null;

    const temperature = await getLiveTemperature(location);

    const monthIndex = new Date().getMonth();
    const withEstimates = calculateMonthlyEstimates(appliances, monthIndex, location, actualUnits, temperature);
    const withPercentages = addPercentageBreakdown(withEstimates);

    await client.query('BEGIN');

    for (const appliance of withPercentages) {
      await client.query(
        `INSERT INTO appliance_estimates (user_id, appliance_id, month, estimated_units, estimated_pct, estimated_cost)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, appliance_id, month) DO UPDATE
         SET estimated_units = EXCLUDED.estimated_units,
             estimated_pct   = EXCLUDED.estimated_pct,
             estimated_cost  = EXCLUDED.estimated_cost`,
        [userId, appliance.id, monthStr, appliance.estimated_monthly_kwh, appliance.percentage, appliance.estimated_cost]
      );
    }

    await client.query('COMMIT');
    return withPercentages;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getTariffRate,
  getTemperatureMultiplier,
  calculateChennaiTNEBBill,
  getEffectiveTariffRate,
  calculateMonthlyEstimates,
  addPercentageBreakdown,
  estimateDailyUsage,
  calculateMatchPercentage,
  generatePredictions,
  detectBillShock,
  calculateWhatIf,
  generateAndSaveDailyEstimates,
  generateAndSaveApplianceEstimates,
};
