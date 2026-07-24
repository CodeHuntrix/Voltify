import { create } from 'zustand'

interface AuthState {
  user: any | null
  token: string | null
  setAuth: (user: any, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null })
}))
