/**
 * 20 hardcoded fake users for the leaderboard
 * Segmented by household_type
 * Realistic Tamil Nadu / Indian names and data
 */
const mockLeaderboardUsers = {
  bachelor: [
    { id: 'mock-b-1', name: 'Arjun Krishnan',  coins: 1240, streak_days: 45, savings_pct: 18, rank_change: 2  },
    { id: 'mock-b-2', name: 'Rohit Sharma',    coins: 1180, streak_days: 38, savings_pct: 16, rank_change: 1  },
    { id: 'mock-b-3', name: 'Karan Mehta',     coins: 1050, streak_days: 30, savings_pct: 15, rank_change: 0  },
    { id: 'mock-b-4', name: 'Vivek Anand',     coins:  980, streak_days: 22, savings_pct: 13, rank_change: -1 },
    { id: 'mock-b-5', name: 'Suresh Babu',     coins:  920, streak_days: 18, savings_pct: 12, rank_change: 3  },
  ],
  family: [
    { id: 'mock-f-1', name: 'Priya Raghavan',  coins: 1380, streak_days: 52, savings_pct: 20, rank_change: 1  },
    { id: 'mock-f-2', name: 'Deepa Murali',    coins: 1290, streak_days: 44, savings_pct: 18, rank_change: 2  },
    { id: 'mock-f-3', name: 'Kavitha Nair',    coins: 1150, streak_days: 35, savings_pct: 16, rank_change: -1 },
    { id: 'mock-f-4', name: 'Meena Selvan',    coins: 1020, streak_days: 28, savings_pct: 14, rank_change: 0  },
    { id: 'mock-f-5', name: 'Lakshmi Iyer',    coins:  950, streak_days: 21, savings_pct: 12, rank_change: 4  },
    { id: 'mock-f-6', name: 'Anitha Rajan',    coins:  870, streak_days: 15, savings_pct: 11, rank_change: 1  },
    { id: 'mock-f-7', name: 'Sunitha Mohan',   coins:  790, streak_days: 12, savings_pct:  9, rank_change: -2 },
  ],
  large_family: [
    { id: 'mock-l-1', name: 'Rajesh Kumar',    coins: 1100, streak_days: 40, savings_pct: 15, rank_change: 0  },
    { id: 'mock-l-2', name: 'Venkat Subbu',    coins:  980, streak_days: 32, savings_pct: 13, rank_change: 2  },
    { id: 'mock-l-3', name: 'Murugan Pillai',  coins:  840, streak_days: 25, savings_pct: 11, rank_change: 1  },
    { id: 'mock-l-4', name: 'Senthil Nathan',  coins:  720, streak_days: 18, savings_pct:  9, rank_change: -1 },
  ],
  organization: [
    { id: 'mock-o-1', name: 'Infosys Chennai', coins: 2100, streak_days: 60, savings_pct: 22, rank_change: 1  },
    { id: 'mock-o-2', name: 'TCS Sholinganallur', coins: 1950, streak_days: 55, savings_pct: 19, rank_change: 0 },
    { id: 'mock-o-3', name: 'Wipro Perungudi', coins: 1700, streak_days: 48, savings_pct: 17, rank_change: 3  },
    { id: 'mock-o-4', name: 'Zoho Corp',       coins: 1500, streak_days: 42, savings_pct: 15, rank_change: -1 },
  ],
};

/**
 * Coin shop items
 */
const coinShopItems = [
  { id: 'shop-1', coins_required: 100,  reward: '₹50 Amazon Voucher',      description: 'Redeemable on amazon.in' },
  { id: 'shop-2', coins_required: 250,  reward: '₹150 Smart Plug Coupon',  description: 'TP-Link or Philips plug' },
  { id: 'shop-3', coins_required: 500,  reward: '₹500 Bill Credit',        description: 'Credited to your electricity account' },
  { id: 'shop-4', coins_required: 1000, reward: '₹1,200 Smart Meter Voucher', description: 'Upgrade to Tier 2 free' },
];

/**
 * CSS (Comfort-Safe Savings) recommendations
 * These are rule-based, hardcoded from BEE guidelines
 */
const cssRecommendations = [
  {
    id: 'css-ac',
    appliance: 'AC',
    title: 'Raise AC Temperature',
    current_setting: '18°C',
    recommended_setting: '24°C',
    savings_pct: 12,
    comfort_pct: 89,
    monthly_savings_rs: 800,
    explanation: 'BEE recommends 24°C as optimal for Indian climates. Raising from 18°C to 24°C reduces compressor load by ~12% while maintaining 89% comfort. Every 1°C increase saves ~6% energy.',
    slider_min: 18,
    slider_max: 26,
    slider_default: 24,
    slider_unit: '°C',
    savings_per_degree: 6,
  },
  {
    id: 'css-geyser',
    appliance: 'Geyser',
    title: 'Shift Geyser to Off-Peak Hours',
    current_setting: 'Peak hours (6–9 PM)',
    recommended_setting: 'Off-peak (6–9 AM)',
    savings_pct: 8,
    comfort_pct: 100,
    monthly_savings_rs: 45,
    explanation: 'Running the geyser during off-peak hours (6–9 AM) costs the same but avoids contributing to grid peak load. Zero comfort impact — water is just as hot.',
    slider_min: null,
    slider_max: null,
    slider_unit: null,
  },
  {
    id: 'css-fridge',
    appliance: 'Fridge',
    title: 'Raise Fridge Temperature Slightly',
    current_setting: '2°C',
    recommended_setting: '4°C',
    savings_pct: 8,
    comfort_pct: 95,
    monthly_savings_rs: 120,
    explanation: 'WHO food safety guidelines recommend 0–4°C. Setting to 4°C saves ~8% energy while keeping all food safe. Cold items are just slightly less cold.',
    slider_min: 1,
    slider_max: 6,
    slider_default: 4,
    slider_unit: '°C',
  },
  {
    id: 'css-tv-standby',
    appliance: 'TV',
    title: 'Turn Off TV Standby Mode',
    current_setting: 'Standby ON',
    recommended_setting: 'Standby OFF',
    savings_pct: 3,
    comfort_pct: 100,
    monthly_savings_rs: 30,
    explanation: 'TVs in standby consume 5–10W continuously. Turning off at the switch saves ₹30/month with zero comfort impact.',
    slider_min: null,
    slider_max: null,
    slider_unit: null,
  },
  {
    id: 'css-fan',
    appliance: 'Fan',
    title: 'Reduce Fan Speed by One Step',
    current_setting: 'Speed 5',
    recommended_setting: 'Speed 4',
    savings_pct: 5,
    comfort_pct: 90,
    monthly_savings_rs: 25,
    explanation: 'Fans consume power proportional to speed³. Reducing from speed 5 to 4 cuts ~20% fan power while maintaining good airflow. Noticeable only in peak summer.',
    slider_min: 1,
    slider_max: 5,
    slider_default: 4,
    slider_unit: '',
  },
];

module.exports = { mockLeaderboardUsers, coinShopItems, cssRecommendations };
