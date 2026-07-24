// src/store/gamificationStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Challenge } from '../types/dashboard';

interface GamificationState {
  coins: number;
  streak_days: number;
  rank: number;
  active_challenge: Challenge | null;
  challenge_history: Challenge[];
  css_applied: string[];
  
  addCoins: (amount: number) => void;
  setCoins: (amount: number) => void;
  setStreak: (days: number) => void;
  incrementStreak: () => void;
  setRank: (rank: number) => void;
  setChallenge: (challenge: Challenge) => void;
  completeChallenge: () => void;
  applyCss: (id: string) => void;
  removeCss: (id: string) => void;
  resetGamification: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      coins: 0,
      streak_days: 0,
      rank: 47,
      active_challenge: {
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
      },
      challenge_history: [
        { id: 'c-1', title: 'Use under 110 units', target_units: 110, current_units: 98,  days_remaining: 0, difficulty: 'easy',   coins_reward: 120, status: 'completed', week_start: '', week_end: '' },
        { id: 'c-2', title: 'Use under 115 units', target_units: 115, current_units: 103, days_remaining: 0, difficulty: 'easy',   coins_reward: 110, status: 'completed', week_start: '', week_end: '' },
        { id: 'c-3', title: 'Use under 105 units', target_units: 105, current_units: 120, days_remaining: 0, difficulty: 'medium', coins_reward: 0,   status: 'failed',    week_start: '', week_end: '' },
      ],
      css_applied: [],

      addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
      setCoins: (coins) => set({ coins }),
      setStreak: (streak_days) => set({ streak_days }),
      incrementStreak: () => set((s) => ({ streak_days: s.streak_days + 1 })),
      setRank: (rank) => set({ rank }),
      setChallenge: (challenge) => set({ active_challenge: challenge }),
      completeChallenge: () => {
        const { active_challenge, challenge_history } = get();
        if (!active_challenge) return;
        const completed = { ...active_challenge, status: 'completed' as const };
        set({
          active_challenge: null,
          challenge_history: [completed, ...challenge_history],
          coins: get().coins + active_challenge.coins_reward,
        });
      },
      applyCss: (id) => set((s) => {
        if (s.css_applied.includes(id)) return {};
        return { css_applied: [...s.css_applied, id] };
      }),
      removeCss: (id) => set((s) => ({
        css_applied: s.css_applied.filter(item => item !== id),
      })),
      resetGamification: () => set({ coins: 0, streak_days: 0, rank: 47, active_challenge: null, challenge_history: [], css_applied: [] }),
    }),
    { name: 'voltify-gamification' }
  )
);
