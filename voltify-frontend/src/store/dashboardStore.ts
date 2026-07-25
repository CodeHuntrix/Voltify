// src/store/dashboardStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Appliance } from '../types/appliance';
import { DailyUsage, ApplianceBreakdown, Insight } from '../types/dashboard';

interface OnboardingData {
  household_type: 'bachelor' | 'family' | 'large_family' | 'organization';
  location: string;
  home_type: 'apartment' | 'house' | 'villa';
  bill_amount: number;
  units_per_month: number;
  appliances: Appliance[];
  estimated_units: number;
  accuracy_pct: number;
  prev_bills: { month: string; amount: number; units: number }[];
}

interface DashboardState {
  onboarding: OnboardingData | null;
  dailyHistory: DailyUsage[];
  applianceBreakdown: ApplianceBreakdown[];
  insights: Insight[];
  isOnboarded: boolean;
  
  setOnboarding: (data: OnboardingData) => void;
  setDailyHistory: (data: DailyUsage[]) => void;
  setApplianceBreakdown: (data: ApplianceBreakdown[]) => void;
  setInsights: (data: Insight[]) => void;
  resetDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      onboarding: null,
      dailyHistory: [],
      applianceBreakdown: [],
      insights: [],
      isOnboarded: false,

      setOnboarding: (data) => set({ onboarding: data, isOnboarded: true }),
      setDailyHistory: (data) => set({ dailyHistory: data }),
      setApplianceBreakdown: (data) => set({ applianceBreakdown: data }),
      setInsights: (data) => set({ insights: data }),
      resetDashboard: () => set({ onboarding: null, dailyHistory: [], applianceBreakdown: [], insights: [], isOnboarded: false }),
    }),
    { name: 'voltify-dashboard' }
  )
);
