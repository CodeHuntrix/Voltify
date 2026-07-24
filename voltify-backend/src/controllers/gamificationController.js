// In-memory state for mock user
let userCoins = 250;
let userStreak = 7;
const recentTransactions = [
  { coins: 50, type: 'streak', reason: '7-day streak milestone!', multiplier: 1.0, created_at: new Date(Date.now() - 3600000).toISOString() },
  { coins: 70, type: 'earned', reason: 'Saved 7 units yesterday', multiplier: 1.0, created_at: new Date(Date.now() - 7200000).toISOString() }
];

const coinShopItems = [
  { id: '1', coins_required: 100, reward: '₹50 Amazon Voucher', description: 'Redeemable on amazon.in' },
  { id: '2', coins_required: 500, reward: '₹500 Bill Credit', description: 'Credited to bill' }
];

let activeChallenge = {
  id: 'c1',
  title: 'Use under 100 units this week',
  target_units: 100,
  current_units: 67,
  days_remaining: 3,
  difficulty: 'medium',
  coins_reward: 150,
  status: 'active',
  week_start: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
  week_end: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
};

const challengeHistory = [
  { id: 'c-1', title: 'Use under 110 units', target_units: 110, current_units: 98,  days_remaining: 0, difficulty: 'easy',   coins_reward: 120, status: 'completed', week_start: '', week_end: '' },
  { id: 'c-2', title: 'Use under 115 units', target_units: 115, current_units: 103, days_remaining: 0, difficulty: 'easy',   coins_reward: 110, status: 'completed', week_start: '', week_end: '' }
];

export const getStats = async (req, res) => {
  res.json({
    balance: userCoins,
    streak_days: userStreak,
    active_multiplier: userStreak >= 7 ? 1.15 : 1.0,
    weekly_coins_earned: 120,
    recent_transactions: recentTransactions,
    next_milestone: { days: 30, bonus_coins: 150, multiplier: 1.35 }
  });
};

export const getChallenge = async (req, res) => {
  res.json({ challenge: activeChallenge, history: challengeHistory });
};

export const checkChallenge = async (req, res) => {
  res.json(activeChallenge);
};

export const getShop = async (req, res) => {
  const itemsWithAffordability = coinShopItems.map(item => ({
    ...item,
    can_afford: userCoins >= item.coins_required,
    coins_needed: Math.max(0, item.coins_required - userCoins),
  }));
  res.json({ items: itemsWithAffordability, user_coins: userCoins });
};

export const redeemItem = async (req, res) => {
  const { item_id } = req.body;
  const item = coinShopItems.find(i => i.id === item_id);
  if (!item) {
    return res.status(404).json({ error: 'Shop item not found' });
  }
  if (userCoins < item.coins_required) {
    return res.status(400).json({ error: 'Insufficient coins' });
  }

  userCoins -= item.coins_required;
  recentTransactions.unshift({
    coins: -item.coins_required,
    type: 'redeemed',
    reason: `Redeemed: ${item.reward}`,
    multiplier: 1.0,
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    message: "Redemption request submitted! We'll contact you within 24 hours.",
    redeemed_item: item.reward,
    coins_spent: item.coins_required,
    new_balance: userCoins,
  });
};

export const dailyCheckin = async (req, res) => {
  const { total_units } = req.body;
  
  userStreak += 1;
  const baseCoins = 25;
  const multiplier = userStreak >= 7 ? 1.15 : 1.0;
  const finalCoins = Math.round(baseCoins * multiplier);
  userCoins += finalCoins;

  recentTransactions.unshift({
    coins: finalCoins,
    type: 'checkin',
    reason: 'Daily Check-In Reward',
    multiplier,
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Checked in successfully!',
    coins_earned: finalCoins,
    new_balance: userCoins,
    new_streak: userStreak,
  });
};
