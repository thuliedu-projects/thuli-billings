import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from './BrandLogo';
import { PhoneOtpForm } from './PhoneOtpForm';

export function AuthPage() {
  const { ready, session } = useAuth();
  const navigate = useNavigate();

  if (!ready) {
    return <main className="auth-page" />;
  }
  if (session) {
    return <Navigate to="/account" replace />;
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <BrandLogo className="auth-logo" />
        <div className="auth-gold-rule" aria-hidden="true" />
        <h1>Welcome Back!</h1>
        <p className="auth-sub">Log in with the same mobile number you use in the app.</p>
        <PhoneOtpForm
          onVerified={() => navigate('/account')}
          footer={
            <>
              Don&apos;t have an account? <Link to="/checkout">Sign up</Link>
            </>
          }
        />
      </div>
    </main>
  );
}
