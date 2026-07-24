// src/lib/mockData.ts
import { LeaderboardEntry } from '../types/dashboard';

const TAMIL_NAMES = [
  'Rahul Kumar', 'Priya M', 'Arun S', 'Deepa R', 'Kiran T',
  'Kavitha N', 'Surya P', 'Meena V', 'Vijay K', 'Anitha S',
  'Rajan M', 'Shanthi T', 'Bala K', 'Revathi J', 'Manoj P',
  'Sundari C', 'Ganesh R', 'Padma N', 'Venkat S', 'Lakshmi T',
];

export function generateLeaderboard(
  householdType: string,
  currentUser: { name: string; coins: number; streak: number; rank: number }
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = TAMIL_NAMES.slice(0, 19).map((name, idx) => ({
    rank: idx + 1,
    name,
    coins: Math.round(1800 - idx * 65 + Math.random() * 50),
    streak: Math.max(1, Math.round(50 - idx * 2 + Math.random() * 5)),
    savings_pct: Math.max(2, Math.round(20 - idx * 0.7 + Math.random() * 3)),
    rank_change: Math.round((Math.random() - 0.5) * 10),
    is_current_user: false,
  }));

  // Insert current user at their rank
  const userEntry: LeaderboardEntry = {
    rank: currentUser.rank,
    name: currentUser.name + ' (You)',
    coins: currentUser.coins,
    streak: currentUser.streak,
    savings_pct: 8,
    rank_change: 12,
    is_current_user: true,
  };

  entries.splice(currentUser.rank - 1, 0, userEntry);
  return entries.slice(0, 20).map((e, i) => ({ ...e, rank: i + 1 }));
}

export const MOCK_NOTIFICATIONS = [
  {
    id: '1', type: 'bill_alert', read: false,
    title: '⚠️ Bill Alert',
    message: 'Your usage is trending ₹500 above last month',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    action_url: '/dashboard',
  },
  {
    id: '2', type: 'leaderboard', read: false,
    title: '🏆 Leaderboard Update',
    message: 'You moved up 12 spots — now ranked #47!',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    action_url: '/leaderboard',
  },
  {
    id: '3', type: 'streak', read: true,
    title: '🔥 Streak Milestone',
    message: '7-day streak achieved! 1.15x multiplier now active',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    action_url: '/leaderboard',
  },
  {
    id: '4', type: 'challenge', read: true,
    title: '🎯 New Challenge',
    message: 'New weekly challenge: Use under 100 units this week',
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    action_url: '/leaderboard',
  },
  {
    id: '5', type: 'tip', read: true,
    title: '💡 Savings Tip',
    message: 'Reducing AC by 2 hrs saves ₹540/month',
    created_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
    action_url: '/predictions',
  },
];

export const CSS_RECOMMENDATIONS = [
  {
    id: 'ac_temp',
    appliance: 'Air Conditioner',
    icon: '❄️',
    current_label: '18°C',
    recommended_label: '24°C',
    slider_min: 18,
    slider_max: 26,
    slider_default: 24,
    savings_formula: (val: number) => Math.round((val - 18) * 1.8 * 8), // % saved
    comfort_formula: (val: number) => Math.round(100 - (val - 18) * 1.5), // % comfort
    monthly_savings_formula: (pct: number) => Math.round(pct * 90),
    why_safe: 'BEE (Bureau of Energy Efficiency) recommends 24°C as optimal for Indian climates. Each degree above 18°C saves ~6% energy while maintaining healthy indoor temperatures.',
  },
  {
    id: 'fridge_temp',
    appliance: 'Refrigerator',
    icon: '🧊',
    current_label: '2°C',
    recommended_label: '4°C',
    savings_pct: 8,
    comfort_pct: 95,
    monthly_savings: 120,
    why_safe: 'Food remains safe at 4°C (WHO standard). Raising from 2°C to 4°C reduces compressor load by ~8% with no impact on food safety.',
  },
  {
    id: 'geyser_timing',
    appliance: 'Geyser',
    icon: '🚿',
    current_label: 'Any time',
    recommended_label: '6–9 AM off-peak',
    savings_pct: 15,
    comfort_pct: 100,
    monthly_savings: 45,
    why_safe: 'Shifting geyser usage to 6-9 AM avoids peak tariff hours in most DISCOMs. Water stays hot in the tank for 2+ hours. Zero comfort impact.',
  },
  {
    id: 'tv_standby',
    appliance: 'Television',
    icon: '📺',
    current_label: 'Standby on',
    recommended_label: 'Standby off',
    savings_pct: 5,
    comfort_pct: 100,
    monthly_savings: 30,
    why_safe: 'Standby mode uses 5-10W continuously. Turning off at the plug instead of remote saves ₹30/month with zero comfort loss.',
  },
];
