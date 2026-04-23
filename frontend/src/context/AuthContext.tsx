import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserProfile, InsuranceProfile } from '@/types';
import { clearAllGiContinuityForLogout } from '@/lib/giContinuity';
import {
  apiLogin,
  apiRegister,
  fetchUserMe,
  insuranceProfileFromApi,
  insuranceProfileToApi,
  patchUserMe,
  setApiAccessTokenGetter,
  userProfileFromApi,
  userProfileToApi,
} from '@/api/client';
import { isInsuranceProfileComplete, isUserProfileComplete } from '@/lib/profileComplete';

const TOKEN_KEY = 'carecost_token';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
  profile: UserProfile | null;
  insurance: InsuranceProfile | null;
  onboardingComplete: boolean;
  intakePayload: Record<string, unknown> | null;
}

interface AuthContextType extends AuthState {
  meReady: boolean;
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
  onboardingComplete: false,
  intakePayload: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { ...initialState, isAuthenticated: true, user: { email: payload.email || '' } };
      } catch {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    }
    return initialState;
  });
  const [meReady, setMeReady] = useState(!state.isAuthenticated);

  useEffect(() => {
    setApiAccessTokenGetter(async () => sessionStorage.getItem(TOKEN_KEY));
    return () => setApiAccessTokenGetter(null);
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated) {
      setMeReady(true);
      return;
    }
    setMeReady(false);
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchUserMe();
        if (cancelled) return;
        let up = userProfileFromApi(me.user_profile ?? undefined);
        const ins = insuranceProfileFromApi(me.insurance_profile ?? undefined);
        if (
          up && ins &&
          isUserProfileComplete(up) &&
          isInsuranceProfileComplete(ins) &&
          up.onboardingCompleted !== true
        ) {
          up = { ...up, onboardingCompleted: true };
          void patchUserMe({
            user_profile: userProfileToApi(up),
            insurance_profile: insuranceProfileToApi(ins),
          }).catch(() => {});
        }
        const profileDone = up && ins && isUserProfileComplete(up) && isInsuranceProfileComplete(ins);
        setState(s => ({
          ...s,
          profile: up ?? s.profile,
          insurance: ins ?? s.insurance,
          onboardingComplete: up?.onboardingCompleted === true || !!profileDone,
        }));
      } catch {
        /* API not available */
      } finally {
        if (!cancelled) setMeReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [state.isAuthenticated]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    sessionStorage.setItem(TOKEN_KEY, res.access_token);
    setState(s => ({ ...s, isAuthenticated: true, user: { email: res.email || email } }));
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await apiRegister(email, password);
    sessionStorage.setItem(TOKEN_KEY, res.access_token);
    setState(s => ({ ...s, isAuthenticated: true, user: { email: res.email || email } }));
  }, []);

  const logout = useCallback(() => {
    setState(s => {
      clearAllGiContinuityForLogout(s.user?.email);
      return { ...initialState };
    });
    sessionStorage.removeItem(TOKEN_KEY);
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
        meReady,
        login,
        logout,
        signup,
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
