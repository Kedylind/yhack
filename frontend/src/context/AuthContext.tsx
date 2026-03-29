import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import type { UserProfile, InsuranceProfile } from '@/types';
import { clearAllGiContinuityForLogout } from '@/lib/giContinuity';
import { isAuth0Configured } from '@/config/auth';
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
  onboardingComplete: boolean;
  /** Normalized intake payload for /api/estimate (demo; client-only). */
  intakePayload: Record<string, unknown> | null;
}

interface AuthContextType extends AuthState {
  /** Auth0: redirect to Universal Login. Legacy: stub sign-in (email/password ignored for password). */
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

function LegacyAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const login = useCallback(async (email: string, _password: string) => {
    setState(s => ({ ...s, isAuthenticated: true, user: { email } }));
  }, []);

  const signup = useCallback(async (email: string, _password: string) => {
    setState(s => ({ ...s, isAuthenticated: true, user: { email } }));
  }, []);

  const logout = useCallback(() => {
    setState(s => {
      clearAllGiContinuityForLogout(s.user?.email);
      return { ...initialState };
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
}

function Auth0SessionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loginWithRedirect, logout: auth0Logout, getAccessTokenSilently } =
    useAuth0();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE ?? '';

  const [state, setState] = useState<AuthState>({
    ...initialState,
    isAuthenticated: false,
  });

  useEffect(() => {
    setState(s => ({ ...s, isAuthenticated }));
  }, [isAuthenticated]);

  useEffect(() => {
    const email = user?.email ?? '';
    setState(s => ({ ...s, user: isAuthenticated && email ? { email } : null }));
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    setApiAccessTokenGetter(async () => {
      try {
        return await getAccessTokenSilently({ authorizationParams: { audience } });
      } catch {
        return null;
      }
    });
    return () => setApiAccessTokenGetter(null);
  }, [getAccessTokenSilently, audience]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchUserMe();
        if (cancelled) return;
        const up = userProfileFromApi(me.user_profile ?? undefined);
        const ins = insuranceProfileFromApi(me.insurance_profile ?? undefined);
        setState(s => ({
          ...s,
          profile: up ?? s.profile,
          insurance: ins ?? s.insurance,
        }));
      } catch {
        /* offline or API not configured */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const login = useCallback(
    async (_email: string, _password: string) => {
      await loginWithRedirect();
    },
    [loginWithRedirect],
  );

  const signup = useCallback(
    async (_email: string, _password: string) => {
      await loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
    },
    [loginWithRedirect],
  );

  const logout = useCallback(() => {
    setState(s => {
      clearAllGiContinuityForLogout(s.user?.email);
      return { ...initialState };
    });
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

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
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAuth0Configured()) {
    return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
  }
  const domain = import.meta.env.VITE_AUTH0_DOMAIN!;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID!;
  const aud = import.meta.env.VITE_AUTH0_AUDIENCE!;

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: aud,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <Auth0SessionProvider>{children}</Auth0SessionProvider>
    </Auth0Provider>
  );
};
