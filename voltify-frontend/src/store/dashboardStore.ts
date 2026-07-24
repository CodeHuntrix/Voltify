import { create } from 'zustand'

interface DashboardState {
  billAmount: number
  appliances: string[]
  applianceBreakdown: any[]
  dailyHistory: any[]
  isOnboarded: boolean
  setBillAmount: (amt: number) => void
  setAppliances: (apps: string[]) => void
  setOnboarding: (data: any) => void
  setApplianceBreakdown: (data: any[]) => void
  setDailyHistory: (data: any[]) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  billAmount: 0,
  appliances: [],
  applianceBreakdown: [],
  dailyHistory: [],
  isOnboarded: false,
  setBillAmount: (billAmount) => set({ billAmount }),
  setAppliances: (appliances) => set({ appliances }),
  setOnboarding: (data) => set({ billAmount: data.bill_amount, isOnboarded: true }),
  setApplianceBreakdown: (applianceBreakdown) => set({ applianceBreakdown }),
  setDailyHistory: (dailyHistory) => set({ dailyHistory })
}))
