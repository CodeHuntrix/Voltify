import { create } from 'zustand'

interface GamificationState {
  coins: number
  rank: number
  addCoins: (amount: number) => void
  setRank: (rank: number) => void
}

export const useGamificationStore = create<GamificationState>((set) => ({
  coins: 0,
  rank: 0,
  addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
  setRank: (rank) => set({ rank })
}))
