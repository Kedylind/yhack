import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UserProfile, InsuranceProfile } from '@/types';
import { clearAllGiContinuityForLogout } from '@/lib/giContinuity';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
  profile: UserProfile | null;
  insurance: InsuranceProfile | null;
  onboardingComplete: boolean;
  /** Normalized intake payload for /api/estimate (demo; client-only). */
  intakePayload: Record<string, unknown> | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setProfile: (p: UserProfile) => void;
  setInsurance: (i: InsuranceProfile) => void;
  setIntakePayload: (p: Record<string, unknown> | null) => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    profile: null,
    insurance: null,
    onboardingComplete: false,
    intakePayload: null,
  });

  const login = useCallback(async (email: string, _password: string) => {
    // TODO: wire to backend auth endpoint
    setState(s => ({ ...s, isAuthenticated: true, user: { email } }));
  }, []);

  const signup = useCallback(async (email: string, _password: string) => {
    // TODO: wire to backend auth endpoint
    setState(s => ({ ...s, isAuthenticated: true, user: { email } }));
  }, []);

  const logout = useCallback(() => {
    setState(s => {
      clearAllGiContinuityForLogout(s.user?.email);
      return {
        isAuthenticated: false,
        user: null,
        profile: null,
        insurance: null,
        onboardingComplete: false,
        intakePayload: null,
      };
    });
  }, []);

  const setIntakePayload = useCallback((intakePayload: Record<string, unknown> | null) => {
    setState(s => ({ ...s, intakePayload }));
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    setState(s => ({ ...s, profile }));
  }, []);

  const setInsurance = useCallback((insurance: InsuranceProfile) => {
    setState(s => ({ ...s, insurance }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState(s => ({ ...s, onboardingComplete: true }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout, setProfile, setInsurance, setIntakePayload, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
};
