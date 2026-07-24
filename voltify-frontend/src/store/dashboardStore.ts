import { create } from 'zustand'

interface DashboardState {
  billAmount: number
  appliances: string[]
  setBillAmount: (amt: number) => void
  setAppliances: (apps: string[]) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  billAmount: 0,
  appliances: [],
  setBillAmount: (billAmount) => set({ billAmount }),
  setAppliances: (appliances) => set({ appliances })
}))
