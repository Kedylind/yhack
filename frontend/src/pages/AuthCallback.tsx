import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import CareCostLogo from '@/components/CareCostLogo';
import { isAuth0Configured } from '@/config/auth';

/** Auth0 redirects here after Universal Login; SDK completes the code exchange on load. */
function AuthCallbackInner() {
  const { isLoading, error, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (error) return;
    if (isAuthenticated) navigate('/map', { replace: true });
    else navigate('/login', { replace: true });
  }, [isLoading, error, isAuthenticated, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <CareCostLogo />
        <p className="mt-4 text-destructive text-center">Sign-in failed. Try again from the login page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <CareCostLogo />
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
}

const AuthCallback = () => {
  if (!isAuth0Configured()) {
    return <Navigate to="/" replace />;
  }
  return <AuthCallbackInner />;
};

export default AuthCallback;
