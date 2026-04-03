import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { UserProfile, InsuranceProfile } from '@/types';
import { getStoredToken, loginApi, registerApi, setStoredToken } from '@/api/auth';
import { clearAllGiContinuityForLogout } from '@/lib/giContinuity';
import {
  fetchUserMe,
  insuranceProfileFromApi,
  setApiAccessTokenGetter,
  userProfileFromApi,
} from '@/api/client';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
  profile: UserProfile | null;
  insurance: InsuranceProfile | null;
  meLoaded: boolean;
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

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  profile: null,
  insurance: null,
  meLoaded: false,
  onboardingComplete: false,
  intakePayload: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const tokenRef = useRef<string | null>(token);
  const [state, setState] = useState<AuthState>({ ...initialState });

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    setApiAccessTokenGetter(async () => tokenRef.current);
    return () => setApiAccessTokenGetter(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setState(s => ({
        ...initialState,
        meLoaded: true,
        onboardingComplete: s.onboardingComplete,
        intakePayload: s.intakePayload,
      }));
      return;
    }
    let cancelled = false;
    setState(s => ({ ...s, isAuthenticated: true, meLoaded: false }));
    (async () => {
      try {
        const me = await fetchUserMe();
        if (cancelled) return;
        const up = userProfileFromApi(me.user_profile ?? undefined);
        const ins = insuranceProfileFromApi(me.insurance_profile ?? undefined);
        setState(s => ({
          ...s,
          user: me.email ? { email: me.email } : s.user,
          profile: up ?? s.profile,
          insurance: ins ?? s.insurance,
          meLoaded: true,
        }));
      } catch {
        if (!cancelled) {
          setStoredToken(null);
          setToken(null);
          setState(s => ({ ...initialState, meLoaded: true, intakePayload: s.intakePayload }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginApi(email, password);
    setStoredToken(res.access_token);
    setToken(res.access_token);
    setState(s => ({ ...s, user: { email } }));
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await registerApi(email, password);
    setStoredToken(res.access_token);
    setToken(res.access_token);
    setState(s => ({ ...s, user: { email } }));
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setState(s => {
      clearAllGiContinuityForLogout(s.user?.email);
      return { ...initialState, meLoaded: true };
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
      value={{
        ...state,
        login,
        signup,
        logout,
        setProfile,
        setInsurance,
        setIntakePayload,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
