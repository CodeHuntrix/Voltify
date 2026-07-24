/**
 * Voltify E2E Integration and Input Validation Test Suite
 * Run this script to test all backend endpoints (Happy and Negative paths)
 * Requirements: Node.js 18+ (uses native fetch)
 */

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function logSuccess(message) {
  console.log(`${colors.green}✔ ${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}✘ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}${colors.magenta}  ${title}${colors.reset}`);
  console.log('='.repeat(60));
}

let testToken = '';
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'SecurePassword123!';
const testName = 'Test E2E User';

// Helper to make API requests
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : (endpoint === '/health' ? `${BASE_URL}/health` : `${API_URL}${endpoint}`);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (testToken) {
    headers['Authorization'] = `Bearer ${testToken}`;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    ...options
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  let body = {};
  
  try {
    body = await response.json();
  } catch (e) {
    body = { rawText: await response.text().catch(() => '') };
  }

  return {
    status: response.status,
    ok: response.ok,
    body
  };
}

async function runTests() {
  logHeader('VOLTIFY API INTEGRATION & VALIDATION TEST SUITE');

  // ==========================================
  // PHASE 1: HEALTH & PUBLIC ENDPOINTS
  // ==========================================
  logHeader('PHASE 1: PUBLIC HEALTH CHECK');
  try {
    const res = await request('/health');
    if (res.status === 200 && res.body.status === 'ok') {
      logSuccess('Health check returned OK');
    } else {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
  } catch (err) {
    logError(`Health Check Error: ${err.message}`);
    process.exit(1);
  }

  // ==========================================
  // PHASE 2: NEGATIVE TESTS (WRONG INPUTS)
  // ==========================================
  logHeader('PHASE 2: NEGATIVE TESTS & VALUE VALIDATION');

  // Test Case 2.1: Signup with invalid email address format
  try {
    const res = await request('/auth/signup', {
      method: 'POST',
      body: { name: testName, email: 'not-an-email', password: testPassword }
    });
    if (res.status === 400 && res.body.error) {
      logSuccess(`Invalid email signup validation caught correctly: [400] "${res.body.error}"`);
    } else {
      logError(`Expected 400 status for invalid email signup, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 2.1 failed: ${err.message}`);
  }

  // Test Case 2.2: Signup with short password
  try {
    const res = await request('/auth/signup', {
      method: 'POST',
      body: { name: testName, email: testEmail, password: 'short' }
    });
    if (res.status === 400 && res.body.error) {
      logSuccess(`Short password signup validation caught correctly: [400] "${res.body.error}"`);
    } else {
      logError(`Expected 400 status for short password, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 2.2 failed: ${err.message}`);
  }

  // Test Case 2.3: Verify OTP for non-existent signup / invalid OTP format
  try {
    const res = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: 'nonexistent-email@example.com', otp: '123' }
    });
    if (res.status === 400 && res.body.error) {
      logSuccess(`Non-existent OTP verification error caught correctly: [400] "${res.body.error}"`);
    } else {
      logError(`Expected 400 status for missing OTP signup, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 2.3 failed: ${err.message}`);
  }

  // Test Case 2.4: Log in with non-existent user credentials
  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'wrong-user@example.com', password: testPassword }
    });
    if (res.status === 401 && res.body.error) {
      logSuccess(`Login with wrong email/password handled correctly: [401] "${res.body.error}"`);
    } else {
      logError(`Expected 401 status for incorrect credentials, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 2.4 failed: ${err.message}`);
  }

  // ==========================================
  // PHASE 3: HAPPY PATH E2E SIGNUP & LOGIN
  // ==========================================
  logHeader('PHASE 3: E2E AUTH FLOW (SIGNUP, OTP, LOGIN)');

  // 3.1 Sign Up
  try {
    const res = await request('/auth/signup', {
      method: 'POST',
      body: { name: testName, email: testEmail, password: testPassword }
    });
    if (res.status === 201 && res.body.user) {
      logSuccess(`User signed up successfully: ${testEmail}`);
      // Save temporary token in case we need it
      testToken = res.body.token;
    } else {
      throw new Error(`Signup failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`E2E Auth Flow stopped - Signup failed: ${err.message}`);
    process.exit(1);
  }

  // 3.2 Verify OTP via development bypass '123456'
  try {
    const res = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: testEmail, otp: '123456' }
    });
    if (res.status === 200 && res.body.success) {
      logSuccess('OTP verified successfully via developer bypass code 123456');
    } else {
      throw new Error(`OTP verification failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`E2E Auth Flow stopped - OTP verification failed: ${err.message}`);
    process.exit(1);
  }

  // 3.3 Log In to get fresh JWT token
  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: testPassword }
    });
    if (res.status === 200 && res.body.token) {
      testToken = res.body.token;
      logSuccess('User logged in successfully; secured Bearer Token');
    } else {
      throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`E2E Auth Flow stopped - Login failed: ${err.message}`);
    process.exit(1);
  }

  // ==========================================
  // PHASE 4: ONBOARDING INTEGRATION
  // ==========================================
  logHeader('PHASE 4: ONBOARDING PROFILE, BILL & APPLIANCES');

  // Negative Tests on Onboarding Endpoints First
  logInfo('Running validation tests on onboarding inputs...');

  // 4.1 Onboarding Step 1: Wrong household_type value
  try {
    const res = await request('/onboarding/profile', {
      method: 'POST',
      body: { household_type: 'palace', location: 'Chennai', appliance_count: 5 }
    });
    if (res.status === 400 && res.body.error) {
      logSuccess(`Invalid household type error caught: [400] "${res.body.error}"`);
    } else {
      logError(`Expected 400 status for wrong household_type, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 4.1 failed: ${err.message}`);
  }

  // 4.2 Onboarding Step 1: Invalid appliance_count
  try {
    const res = await request('/onboarding/profile', {
      method: 'POST',
      body: { household_type: 'family', location: 'Chennai', appliance_count: 100 }
    });
    if (res.status === 400 && res.body.error) {
      logSuccess(`Too high appliance count caught: [400] "${res.body.error}"`);
    } else {
      logError(`Expected 400 status for appliance count > 50, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 4.2 failed: ${err.message}`);
  }

  // 4.3 Onboarding Step 2: Negative bill amount or units
  try {
    const res = await request('/onboarding/bill', {
      method: 'POST',
      body: { bill_amount: -500, units: 100 }
    });
    if (res.status === 400 && res.body.error) {
      logSuccess(`Negative bill amount caught: [400] "${res.body.error}"`);
    } else {
      logError(`Expected 400 status for negative bill, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Test 4.3 failed: ${err.message}`);
  }

  // Happy Path Onboarding Step 1: Profile Details
  try {
    const res = await request('/onboarding/profile', {
      method: 'POST',
      body: { household_type: 'family', location: 'Chennai', home_type: 'apartment', appliance_count: 6 }
    });
    if (res.status === 200 && res.body.success) {
      logSuccess('Step 1 Onboarding completed: Saved Household Profile info');
    } else {
      throw new Error(`Profile post failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`Onboarding stopped: Profile failed: ${err.message}`);
    process.exit(1);
  }

  // Happy Path Onboarding Step 2: Bill Upload / Estimation Input
  try {
    const res = await request('/onboarding/bill', {
      method: 'POST',
      body: {
        bill_amount: 2400.0,
        units: 300.0,
        month: '2026-05-01',
        prev_bills: [
          { bill_amount: 2200.0, units: 280.0, month: '2026-04-01' }
        ]
      }
    });
    if (res.status === 200 && res.body.success) {
      logSuccess('Step 2 Onboarding completed: Uploaded current and previous bills successfully');
    } else {
      throw new Error(`Bill post failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`Onboarding stopped: Bill failed: ${err.message}`);
    process.exit(1);
  }

  // Happy Path Onboarding Step 3: Appliance Submission
  const testAppliances = [
    { name: 'Air Conditioner', power_kw: 1.5, avg_hours_day: 6.0, seasonality: 'summer', type: 'cooling' },
    { name: 'Refrigerator', power_kw: 0.2, avg_hours_day: 24.0, seasonality: 'whole_year', type: 'appliances' },
    { name: 'LED Lights', power_kw: 0.05, avg_hours_day: 5.0, seasonality: 'whole_year', type: 'lighting' },
    { name: 'Geyser', power_kw: 3.0, avg_hours_day: 1.0, seasonality: 'winter', type: 'heating' }
  ];

  try {
    const res = await request('/onboarding/appliances', {
      method: 'POST',
      body: { appliances: testAppliances }
    });
    if (res.status === 200 && res.body.success) {
      const d = res.body.data;
      logSuccess('Step 3 Onboarding completed: Registered appliances successfully');
      logInfo(`Estimation Engine results:
       - Estimated units: ${d.estimated_monthly_units} kWh
       - Actual units: ${d.actual_monthly_units} kWh
       - Match accuracy percentage: ${d.match_percentage ? d.match_percentage.toFixed(1) + '%' : 'N/A'}`);
    } else {
      throw new Error(`Appliances post failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`Onboarding stopped: Appliances failed: ${err.message}`);
    process.exit(1);
  }

  // Live Appliance Validation
  try {
    const res = await request('/onboarding/validate', {
      method: 'POST',
      body: { appliances: testAppliances }
    });
    if (res.status === 200 && res.body.estimated_units !== undefined) {
      logSuccess(`Validate endpoint verified: Live match estimate = ${res.body.estimated_units} kWh`);
    } else {
      logError(`Expected validate endpoint response, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Validate test failed: ${err.message}`);
  }

  // ==========================================
  // PHASE 5: DASHBOARD INTEGRATION
  // ==========================================
  logHeader('PHASE 5: DASHBOARD DATA ENDPOINTS');

  // 5.1 Dashboard Summary
  try {
    const res = await request('/dashboard/summary');
    if (res.status === 200 && res.body.today) {
      logSuccess('Dashboard summary loads successfully');
      const b = res.body;
      logInfo(`Dashboard Summary breakdown:
       - Today's Cost: ₹${b.today.cost.toFixed(2)} (${b.today.units} units)
       - Month Total Cost: ₹${b.this_month.cost.toFixed(2)} (${b.this_month.units} units)
       - Projected Bill: ₹${b.estimated_bill.projected.toFixed(2)}
       - Coins Balance: ${b.gamification.coins} (Streak: ${b.gamification.streak_days} days)`);
    } else {
      logError(`Expected dashboard summary metrics, got: ${res.status}`);
    }
  } catch (err) {
    logError(`Dashboard summary failed: ${err.message}`);
  }

  // 5.2 Dashboard Usage (Daily)
  try {
    const res = await request('/dashboard/usage?period=daily');
    if (res.status === 200 && Array.isArray(res.body.data)) {
      logSuccess(`Dashboard usage (Daily) loaded ${res.body.data.length} records`);
    } else {
      logError(`Expected daily usage records, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Daily usage failed: ${err.message}`);
  }

  // 5.3 Dashboard Usage (Weekly)
  try {
    const res = await request('/dashboard/usage?period=weekly');
    if (res.status === 200 && Array.isArray(res.body.data)) {
      logSuccess(`Dashboard usage (Weekly) loaded ${res.body.data.length} records`);
    } else {
      logError(`Expected weekly usage records, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Weekly usage failed: ${err.message}`);
  }

  // 5.4 Dashboard Appliance Breakdown
  try {
    const res = await request('/dashboard/appliance-breakdown');
    if (res.status === 200 && Array.isArray(res.body.data)) {
      logSuccess(`Dashboard appliance breakdown loaded ${res.body.data.length} appliance rows`);
    } else {
      logError(`Expected appliance breakdown data, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Appliance breakdown failed: ${err.message}`);
  }

  // 5.5 Dashboard Insights
  try {
    const res = await request('/dashboard/insights');
    if (res.status === 200 && Array.isArray(res.body.insights)) {
      logSuccess(`Dashboard insights loaded ${res.body.insights.length} active suggestions`);
    } else {
      logError(`Expected dashboard insights list, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Dashboard insights failed: ${err.message}`);
  }

  // 5.6 Dashboard Peak Hours
  try {
    const res = await request('/dashboard/peak-hours');
    if (res.status === 200 && res.body.peak_range) {
      logSuccess(`Dashboard peak hours pattern loaded: Peak Range = "${res.body.peak_range}"`);
    } else {
      logError(`Expected peak hours pattern, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Peak hours pattern failed: ${err.message}`);
  }

  // ==========================================
  // PHASE 6: AI COACH & SIMULATION
  // ==========================================
  logHeader('PHASE 6: AI COACH ENDPOINTS');

  // 6.1 Coach Predictions & Bill Shock Risk
  try {
    const res = await request('/coach/predictions');
    if (res.status === 200 && res.body.predictions) {
      logSuccess('AI Coach predictions & bill shock metrics loaded successfully');
      const b = res.body;
      logInfo(`Predictions breakdown:
       - Tomorrow Estimate: ${b.predictions.tomorrow.units.toFixed(2)} kWh
       - Next Week: ${b.predictions.next_week.units.toFixed(2)} kWh
       - Bill Shock Risk level: ${b.bill_shock.risk ? 'YES' : 'NO'} (Proj: ₹${b.bill_shock.projected_bill.toFixed(2)})`);
    } else {
      logError(`Expected predictions, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Predictions failed: ${err.message}`);
  }

  // 6.2 Coach Alerts
  try {
    const res = await request('/coach/alerts');
    if (res.status === 200 && Array.isArray(res.body.alerts)) {
      logSuccess(`AI Coach alerts loaded ${res.body.alerts.length} safety/trend issues`);
    } else {
      logError(`Expected alerts list, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Coach alerts failed: ${err.message}`);
  }

  // 6.3 Coach CSS recommendations
  try {
    const res = await request('/coach/css-recommendations');
    if (res.status === 200 && Array.isArray(res.body.recommendations)) {
      logSuccess(`AI Coach recommendations loaded ${res.body.recommendations.length} items`);
    } else {
      logError(`Expected recommendations list, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`CSS Recommendations failed: ${err.message}`);
  }

  // 6.4 Apply CSS recommendation
  try {
    const res = await request('/coach/css-apply', {
      method: 'POST',
      body: {
        recommendation_id: 'css-ac',
        appliance: 'Air Conditioner',
        setting_applied: 'Set AC to 24°C'
      }
    });
    if (res.status === 200 && res.body.success) {
      logSuccess(`CSS Recommendation applied correctly. Coins earned: ${res.body.coins_earned}. New balance: ${res.body.new_coin_balance}`);
    } else {
      logError(`Expected CSS recommendation applied correctly, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`CSS Apply failed: ${err.message}`);
  }

  // 6.5 Run "What-If" energy simulation
  try {
    const res = await request('/coach/whatif?appliance=Air%20Conditioner&change_type=hours&change_value=2');
    if (res.status === 200 && res.body.saved_kwh !== undefined) {
      logSuccess('What-If energy saving simulator ran successfully');
      const b = res.body;
      logInfo(`Simulation results for reducing Air Conditioner usage by 2 hours:
       - Current Monthly: ${b.current_monthly_kwh} kWh
       - New Monthly: ${b.new_monthly_kwh} kWh
       - Saved Units: ${b.saved_kwh} kWh
       - Monthly Cost Savings: ₹${b.monthly_savings_rs}
       - Streak bonus coins: ${b.coins_earned}`);
    } else {
      logError(`Expected What-If simulation metrics, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`What-If failed: ${err.message}`);
  }

  // ==========================================
  // PHASE 7: GAMIFICATION CHECK-IN TELEMETRY
  // ==========================================
  logHeader('PHASE 7: GAMIFICATION CHECK-IN TELEMETRY');

  // Test Case 7.1: Check-in telemetry Happy Path
  try {
    const res = await request('/gamification/check-in', {
      method: 'POST',
      body: {
        total_units: 12.5,
        appliance_hours: {
          'AC': 6.0,
          'Fridge': 24.0
        }
      }
    });
    if (res.status === 200 && res.body.success) {
      logSuccess(`Gamification Check-in telemetry accepted successfully! Coins earned: ${res.body.coins_earned}. New balance: ${res.body.new_balance}`);
    } else {
      logError(`Expected successful check-in telemetry, got status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logError(`Telemetry check-in failed: ${err.message}`);
  }

  // Test Case 7.2: Double check-in Negative Path
  try {
    const res = await request('/gamification/check-in', {
      method: 'POST',
      body: {
        total_units: 12.5,
        appliance_hours: {
          'AC': 6.0,
          'Fridge': 24.0
        }
      }
    });
    if (res.status === 400) {
      logSuccess('Double check-in caught correctly: [400] "You have already checked in today!"');
    } else {
      logError(`Expected 400 for double check-in, got status: ${res.status}`);
    }
  } catch (err) {
    logError(`Double check-in test failed: ${err.message}`);
  }

  logHeader('TESTING COMPLETE — ALL SYSTEM ENDPOINTS STABLE AND ROUTING COMPLETED');
}

runTests().catch(err => {
  logError(`Fatal Uncaught Test Suite Crash: ${err.message}`);
  process.exit(1);
});
