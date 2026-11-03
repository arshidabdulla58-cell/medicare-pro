import { create } from 'zustand';

export type AuthRole = 'SUPER_ADMIN' | 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'NURSE' | 'PHARMACIST' | 'LAB_TECHNICIAN' | 'PATIENT';
export type AuthUser = { id: string; email: string; firstName: string; lastName: string; role: AuthRole };

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  authReady: boolean;
  setAuthReady: () => void;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  authReady: false,
  setAuthReady: () => set({ authReady: true }),
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
