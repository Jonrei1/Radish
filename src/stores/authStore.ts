import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'DOCTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  extension?: string;
  role: UserRole;
  requiresPasswordChange: boolean;
  licenseNumber?: string;
}

export interface AuthState {
  user: AuthUser | null;
  requiresPasswordChange: boolean;
  setUser: (user: AuthUser | null) => void;
  setRequiresPasswordChange: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      requiresPasswordChange: false,
      setUser: (user) =>
        set({
          user,
          requiresPasswordChange: user?.requiresPasswordChange ?? false,
        }),
      setRequiresPasswordChange: (requiresPasswordChange) =>
        set({ requiresPasswordChange }),
      clear: () =>
        set({
          user: null,
          requiresPasswordChange: false,
        }),
    }),
    {
      name: 'radish-auth-storage',
    }
  )
);
