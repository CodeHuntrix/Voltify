const { Pool } = require('pg');

let pool;
const useMock = !process.env.DATABASE_URL;

if (useMock) {
  console.log('⚠️ No DATABASE_URL found. Activating in-memory mock database for offline testing.');

  // In-memory tables
  const db = {
    users: [],
    appliances: [],
    monthly_bills: [],
    notifications: [],
    coins: [],
    challenges: [],
    daily_estimates: [],
    appliance_estimates: []
  };

  // Helper to generate IDs
  let idCounter = 1;
  const nextId = () => idCounter++;

  // Mock pool object
  pool = {
    connect: (cb) => {
      console.log('✅ Mock Database connected successfully (In-Memory)');
      if (cb) cb(null, {}, () => {});
      return Promise.resolve({ query: pool.query, release: () => {} });
    },
    query: async (text, params = []) => {
      const queryStr = text.trim().replace(/\s+/g, ' ');
      // console.log(`[Mock DB Query]: ${queryStr} | Params:`, params);

      let rows = [];

      try {
        // --- USERS ---
        if (queryStr.includes('INSERT INTO users')) {
          // INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *
          const id = nextId();
          const user = {
            id,
            name: params[0],
            email: params[1],
            password_hash: params[2],
            household_type: null,
            location: 'Chennai',
            home_type: null,
            appliance_count: 0,
            onboarding_complete: false,
            coins: 0,
            created_at: new Date()
          };
          db.users.push(user);
          rows = [user];
        } 
        else if (queryStr.includes('SELECT') && queryStr.includes('FROM users WHERE email =')) {
          const email = params[0];
          const user = db.users.find(u => u.email === email);
          rows = user ? [user] : [];
        } 
        else if (queryStr.includes('SELECT') && queryStr.includes('FROM users WHERE id =')) {
          const id = parseInt(params[0]);
          const user = db.users.find(u => u.id === id);
          rows = user ? [user] : [];
        }
        else if (queryStr.includes('UPDATE users SET household_type =')) {
          // UPDATE users SET household_type = $1, location = $2, home_type = $3, appliance_count = $4 WHERE id = $5
          const id = parseInt(params[4]);
          const user = db.users.find(u => u.id === id);
          if (user) {
            user.household_type = params[0];
            user.location = params[1];
            user.home_type = params[2];
            user.appliance_count = params[3];
          }
          rows = user ? [user] : [];
        }
        else if (queryStr.includes('UPDATE users SET onboarding_complete = TRUE')) {
          const id = parseInt(params[0]);
          const user = db.users.find(u => u.id === id);
          if (user) {
            user.onboarding_complete = true;
          }
          rows = user ? [user] : [];
        }
        else if (queryStr.includes('UPDATE users SET') && queryStr.includes('coins =')) {
          const id = parseInt(params[1]);
          const user = db.users.find(u => u.id === id);
          if (user) {
            user.coins = params[0];
          }
          rows = user ? [user] : [];
        }

        // --- MONTHLY BILLS ---
        else if (queryStr.includes('INSERT INTO monthly_bills')) {
          const bill = {
            id: nextId(),
            user_id: parseInt(params[0]),
            month: params[1],
            bill_amount: parseFloat(params[2]),
            units: parseFloat(params[3]),
            estimated_units: null,
            accuracy_pct: null,
            created_at: new Date()
          };
          // ON CONFLICT: update if exists
          const existingIdx = db.monthly_bills.findIndex(b => b.user_id === bill.user_id && b.month === bill.month);
          if (existingIdx > -1) {
            db.monthly_bills[existingIdx] = { ...db.monthly_bills[existingIdx], ...bill };
          } else {
            db.monthly_bills.push(bill);
          }
          rows = [bill];
        }
        else if (queryStr.includes('SELECT') && queryStr.includes('FROM monthly_bills')) {
          const user_id = parseInt(params[0]);
          rows = db.monthly_bills.filter(b => b.user_id === user_id);
          // Sort DESC
          rows.sort((a, b) => new Date(b.month) - new Date(a.month));
        }
        else if (queryStr.includes('UPDATE monthly_bills')) {
          // UPDATE monthly_bills SET estimated_units = $1, accuracy_pct = $2 WHERE user_id = $3 AND month = ...
          const user_id = parseInt(params[2]);
          const latestBill = db.monthly_bills
            .filter(b => b.user_id === user_id)
            .sort((a, b) => new Date(b.month) - new Date(a.month))[0];
          if (latestBill) {
            latestBill.estimated_units = parseFloat(params[0]);
            latestBill.accuracy_pct = parseFloat(params[1]);
          }
          rows = latestBill ? [latestBill] : [];
        }

        // --- APPLIANCES ---
        else if (queryStr.includes('DELETE FROM appliances WHERE user_id =')) {
          const user_id = parseInt(params[0]);
          db.appliances = db.appliances.filter(a => a.user_id !== user_id);
        }
        else if (queryStr.includes('DELETE FROM appliances WHERE id =')) {
          const id = parseInt(params[0]);
          db.appliances = db.appliances.filter(a => a.id !== id);
        }
        else if (queryStr.includes('INSERT INTO appliances')) {
          // INSERT INTO appliances (user_id, name, power_kw, avg_hours_day, seasonality, type)
          const app = {
            id: nextId(),
            user_id: parseInt(params[0]),
            name: params[1],
            power_kw: parseFloat(params[2]),
            avg_hours_day: parseFloat(params[3]),
            seasonality: params[4],
            type: params[5],
            created_at: new Date()
          };
          db.appliances.push(app);
          rows = [app];
        }
        else if (queryStr.includes('SELECT * FROM appliances WHERE user_id =')) {
          const user_id = parseInt(params[0]);
          rows = db.appliances.filter(a => a.user_id === user_id);
        }

        // --- NOTIFICATIONS ---
        else if (queryStr.includes('INSERT INTO notifications')) {
          const notif = {
            id: nextId(),
            user_id: parseInt(params[0]),
            type: params[1],
            title: params[2],
            message: params[3],
            action_url: params[4] || null,
            is_read: false,
            created_at: new Date()
          };
          db.notifications.push(notif);
          rows = [notif];
        }
        else if (queryStr.includes('SELECT') && queryStr.includes('FROM notifications')) {
          const user_id = parseInt(params[0]);
          rows = db.notifications.filter(n => n.user_id === user_id);
          rows.sort((a, b) => b.created_at - a.created_at);
        }

        // --- COINS & TRANSACTIONS ---
        else if (queryStr.includes('INSERT INTO coin_transactions')) {
          const trans = {
            id: nextId(),
            user_id: parseInt(params[0]),
            amount: parseInt(params[1]),
            type: params[2],
            description: params[3],
            created_at: new Date()
          };
          db.coins.push(trans);
          rows = [trans];
        }
        else if (queryStr.includes('SELECT SUM(amount)') && queryStr.includes('coin_transactions')) {
          const user_id = parseInt(params[0]);
          const sum = db.coins.filter(c => c.user_id === user_id).reduce((s, c) => s + c.amount, 0);
          rows = [{ sum: sum || 0 }];
        }

        // --- CHALLENGES ---
        else if (queryStr.includes('INSERT INTO weekly_challenges')) {
          const chal = {
            id: nextId(),
            user_id: parseInt(params[0]),
            target_units: parseFloat(params[1]),
            reward_coins: parseInt(params[2]),
            status: 'active',
            created_at: new Date()
          };
          db.challenges.push(chal);
          rows = [chal];
        }
        else if (queryStr.includes('SELECT') && queryStr.includes('weekly_challenges')) {
          const user_id = parseInt(params[0]);
          rows = db.challenges.filter(c => c.user_id === user_id);
        }

        // --- ESTIMATES ---
        else if (queryStr.includes('INSERT INTO daily_estimates')) {
          // Simply push to internal list
          db.daily_estimates.push({ user_id: parseInt(params[0]), date: params[1], estimated_kwh: parseFloat(params[2]) });
        }
        else if (queryStr.includes('INSERT INTO appliance_estimates')) {
          db.appliance_estimates.push({ user_id: parseInt(params[0]), name: params[1], estimated_monthly_kwh: parseFloat(params[2]), percentage: parseFloat(params[3]) });
        }
      } catch (err) {
        console.error('[Mock DB Error]:', err);
      }

      return { rows };
    },
    end: () => Promise.resolve()
  };
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      return;
    }
    release();
    console.log('✅ Database connected successfully');
  });
}

module.exports = pool;
