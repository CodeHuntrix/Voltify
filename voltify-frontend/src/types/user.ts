// src/types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  tier: 1 | 2 | 3;
  household_type: 'bachelor' | 'family' | 'large_family' | 'organization';
  location: string;
  home_type: 'apartment' | 'house' | 'villa';
  appliance_count: number;
  coins: number;
  streak_days: number;
  created_at: string;
}
