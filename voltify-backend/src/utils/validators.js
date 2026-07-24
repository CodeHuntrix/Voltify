/**
 * Validates an email format
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validates signup input
 * Returns { valid: true } or { valid: false, error: "message" }
 */
const validateSignup = ({ name, email, password }) => {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (name.trim().length > 100) {
    return { valid: false, error: 'Name must be under 100 characters' };
  }
  if (!email || !isValidEmail(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
};

/**
 * Validates login input
 */
const validateLogin = ({ email, password }) => {
  if (!email || !isValidEmail(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  return { valid: true };
};

/**
 * Validates appliance object
 */
const validateAppliance = ({ name, power_kw, avg_hours_day, seasonality }) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Appliance name is required' };
  }
  if (!power_kw || isNaN(power_kw) || power_kw <= 0 || power_kw > 20) {
    return { valid: false, error: `Invalid power value for ${name}: must be 0–20 kW` };
  }
  if (!avg_hours_day || isNaN(avg_hours_day) || avg_hours_day <= 0 || avg_hours_day > 24) {
    return { valid: false, error: `Invalid hours for ${name}: must be 0–24 hours` };
  }
  const validSeasonality = ['whole_year', 'summer', 'winter'];
  if (seasonality && !validSeasonality.includes(seasonality)) {
    return { valid: false, error: `Invalid seasonality for ${name}` };
  }
  return { valid: true };
};

/**
 * Validates bill input
 */
const validateBill = ({ bill_amount, units }) => {
  if (!bill_amount || isNaN(bill_amount) || bill_amount <= 0) {
    return { valid: false, error: 'Bill amount must be a positive number' };
  }
  if (!units || isNaN(units) || units <= 0) {
    return { valid: false, error: 'Units consumed must be a positive number' };
  }
  if (units < 5) {
    return { valid: false, error: 'Units seem too low (minimum 5 kWh)' };
  }
  if (units > 10000) {
    return { valid: false, error: 'Units seem too high (maximum 10,000 kWh)' };
  }
  return { valid: true };
};

module.exports = { validateSignup, validateLogin, validateAppliance, validateBill };
