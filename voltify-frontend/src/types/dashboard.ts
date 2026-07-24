// src/types/dashboard.ts
export interface DailyUsage {
  date: string;
  units: number;
  cost: number;
  label: string;
}

export interface ApplianceBreakdown {
  name: string;
  icon: string;
  units: number;
  percentage: number;
  cost: number;
  color: string;
}

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'tip' | 'info';
  title: string;
  message: string;
  action?: string;
}

export interface Prediction {
  tomorrow: { units: number; cost: number; confidence: number };
  next_week: { units: number; cost: number; confidence: number };
  next_month: { units: number; cost: number; confidence: number };
  bill_shock_risk: boolean;
  projected_bill: number;
}

export interface Challenge {
  id: string;
  title: string;
  target_units: number;
  current_units: number;
  days_remaining: number;
  difficulty: 'easy' | 'medium' | 'hard';
  coins_reward: number;
  status: 'active' | 'completed' | 'failed';
  week_start: string;
  week_end: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  coins: number;
  streak: number;
  savings_pct: number;
  rank_change: number;
  is_current_user?: boolean;
}
