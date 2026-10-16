import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from '../components/BrandLogo';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import {
  loadAdminPlans,
  loadPlatformSnapshot,
  signInWithGoogle,
  type AdminPlan,
  type PlatformSnapshot,
} from '../lib/admin';
import { supabase } from '../lib/supabase';
import { AnalyticsTab } from './admin/AnalyticsTab';
import { PlansTab } from './admin/PlansTab';
import './AccountPage.css';
import './AdminPage.css';

type AdminTab = 'analytics' | 'plans';

let googleSignIn: Promise<void> | null = null;

function callbackSession(): { accessToken: string; refreshToken: string } | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

function hasAuthCallback(): boolean {
  if (callbackSession()) return true;
  return new URLSearchParams(window.location.search).has('code');
}

export function AdminPage() {
  const { ready, session, signOut } = useAuth();
  const access = usePlatformAdmin(session?.user.id);
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [finishingSignIn, setFinishingSignIn] = useState(hasAuthCallback);

  const tab: AdminTab = params.get('tab') === 'plans' ? 'plans' : 'analytics';

  useEffect(() => {
    if (!supabase) return;
    const fromHash = callbackSession();
    const code = new URLSearchParams(window.location.search).get('code');
    if (!fromHash && !code) return;
    if (googleSignIn) return;
    window.history.replaceState({}, '', '/admin');
    const client = supabase;
    googleSignIn = (fromHash
      ? client.auth.setSession({ access_token: fromHash.accessToken, refresh_token: fromHash.refreshToken })
      : client.auth.exchangeCodeForSession(code ?? '')
    ).then(({ error: signInError }) => {
      if (signInError) setAuthError(signInError.message);
      setFinishingSignIn(false);
    });
  }, []);

  useEffect(() => {
    if (access !== 'yes') return;
    let active = true;
    setLoading(true);
    void Promise.all([loadAdminPlans(), loadPlatformSnapshot()])
      .then(([nextPlans, nextSnapshot]) => {
        if (!active) return;
        setPlans(nextPlans);
        setSnapshot(nextSnapshot);
        setError('');
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load the operator console.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [access]);

  function openTab(next: AdminTab) {
    const nextParams = new URLSearchParams(params);
    if (next === 'analytics') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setParams(nextParams, { replace: true });
  }

  async function reload() {
    const [nextPlans, nextSnapshot] = await Promise.all([loadAdminPlans(), loadPlatformSnapshot()]);
    setPlans(nextPlans);
    setSnapshot(nextSnapshot);
  }

  async function onGoogle() {
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (signInError) {
      setAuthError(signInError instanceof Error ? signInError.message : 'Could not open Google sign-in.');
      setSigningIn(false);
    }
  }

  if (!ready) return <main className="account-page" />;

  return (
    <main className="account-page">
      <div className="account-shell">
        <header className="account-head">
          <div className="account-head-brand">
            <BrandLogo className="account-logo" />
            <div>
              <p className="dash-kicker">Operator</p>
              <h1>Admin</h1>
              <p className="account-sub">Plans, customers, and synced sales.</p>
            </div>
          </div>
          {session ? (
            <button type="button" className="account-signout" onClick={() => void signOut()}>
              Log out
            </button>
          ) : null}
        </header>

        {finishingSignIn || access === 'loading' ? <p className="dash-note">Signing you in…</p> : null}
        {access === 'missing' ? (
          <p className="account-error" role="alert">
            Operator access is not on this database yet. Apply the platform admin migration, then add your Google email
            to platform_admins.
          </p>
        ) : null}
        {access === 'no' && !finishingSignIn ? (
          <section className="dash-panel admin-gate">
            <h2>Operator sign-in</h2>
            <p className="dash-note">
              {session
                ? 'This account cannot open the operator console. Sign out, then continue with an allowlisted Google account.'
                : 'Continue with the Google account that was added to the operator list.'}
            </p>
            {session ? null : (
              <button type="button" className="dash-button" disabled={signingIn} onClick={() => void onGoogle()}>
                {signingIn ? 'Opening Google…' : 'Continue with Google'}
              </button>
            )}
            {authError ? (
              <p className="account-error" role="alert">
                {authError}
              </p>
            ) : null}
          </section>
        ) : null}

        {access === 'yes' ? (
          <>
            <div className="account-tabs" role="tablist" aria-label="Operator">
              <button
                type="button"
                role="tab"
                id="tab-analytics"
                className="account-tab"
                aria-selected={tab === 'analytics'}
                onClick={() => openTab('analytics')}
              >
                Analytics
              </button>
              <button
                type="button"
                role="tab"
                id="tab-plans"
                className="account-tab"
                aria-selected={tab === 'plans'}
                onClick={() => openTab('plans')}
              >
                Plans
              </button>
            </div>
            {loading ? <p className="dash-note">Loading…</p> : null}
            {error ? (
              <p className="account-error" role="alert">
                {error}
              </p>
            ) : null}
            {!loading && snapshot && tab === 'analytics' ? (
              <div role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics">
                <AnalyticsTab snapshot={snapshot} />
              </div>
            ) : null}
            {!loading && tab === 'plans' ? (
              <div role="tabpanel" id="panel-plans" aria-labelledby="tab-plans">
                <PlansTab plans={plans} onSaved={reload} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
