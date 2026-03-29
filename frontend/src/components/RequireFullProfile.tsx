import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isAuth0Configured } from '@/config/auth';
import { isInsuranceProfileComplete, isUserProfileComplete } from '@/lib/profileComplete';
import CareCostLogo from '@/components/CareCostLogo';

/** Map / saved require saved profile + coverage + completed onboarding wizard (Auth0: stored flag). */
export default function RequireFullProfile({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profile, insurance, meReady, onboardingComplete } = useAuth();
  const location = useLocation();

  // When Auth0 is not configured, skip all guards (local demo mode)
  if (!isAuth0Configured()) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!meReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <CareCostLogo showTagline={false} compact />
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </div>
    );
  }

  const auth0 = isAuth0Configured();
  const userOk = isUserProfileComplete(profile);
  const insOk = isInsuranceProfileComplete(insurance);
  const wizardOk = auth0 ? profile?.onboardingCompleted === true : onboardingComplete;

  if (!userOk || !insOk || !wizardOk) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
