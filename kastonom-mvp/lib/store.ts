import { create } from 'zustand';

interface AppState {
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: () => void;
  logout: () => void;
  enableDemoMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  isDemoMode: true, // Hackathon Pitch için varsayılan olarak true
  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false }),
  enableDemoMode: () => set({ isDemoMode: true }),
}));