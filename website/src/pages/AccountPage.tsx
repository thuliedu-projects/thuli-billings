import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from '../components/BrandLogo';
import {
  loadAccount,
  subscriptionIsActive,
  type AccountSnapshot,
} from '../lib/account';
import { formatPaise, formatWhen } from '../lib/money';
import { formatIndiaPhone } from '../lib/phone';
import './AccountPage.css';

function statusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'trialing') return 'Trial';
  if (status === 'past_due') return 'Past due';
  if (status === 'canceled') return 'Canceled';
  if (status === 'expired') return 'Expired';
  return status;
}

function eventLabel(eventType: string): string {
  if (eventType === 'payment.captured') return 'Payment';
  return eventType;
}

export function AccountPage() {
  const { ready, session, signOut } = useAuth();
  const [params] = useSearchParams();
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    void loadAccount(userId)
      .then((snapshot) => {
        if (!active) return;
        setAccount(snapshot);
        setError('');
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load your account');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!ready) return <main className="account-page" />;
  if (!session) return <Navigate to="/login" replace />;

  const openOrgs = (account?.orgs ?? []).filter((org) => !org.closedAt);
  const paid = openOrgs.some((org) => subscriptionIsActive(org.subscription));
  const canSeePayments = openOrgs.some((org) => org.role === 'owner' || org.role === 'admin');

  return (
    <main className="account-page">
      <div className="account-card">
        <BrandLogo className="account-logo" />
        <div className="account-gold-rule" aria-hidden="true" />
        <h1>Your account</h1>
        <p className="account-sub">{formatIndiaPhone(session.user.phone) || 'Signed in'}</p>

        {params.get('paid') === '1' ? (
          <p className="account-banner">Payment recorded. You can sign in on the app with this number.</p>
        ) : null}

        {loading ? <p className="account-muted">Loading your plan…</p> : null}
        {error ? (
          <p className="account-error" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !paid ? (
          <div className="account-pay">
            <h2>Payment required</h2>
            <p>Pay for a plan to unlock the mobile app. Until then, sign-in on the app will ask you to pay.</p>
            <Link className="account-pay-link" to="/checkout">
              Pay now
            </Link>
          </div>
        ) : null}

        {openOrgs.map((org) => (
          <section key={org.id} className="account-plan">
            <h2>{org.name}</h2>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>{org.role}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{org.subscription?.plan?.name ?? 'No plan'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{org.subscription ? statusLabel(org.subscription.status) : 'Unpaid'}</dd>
              </div>
              <div>
                <dt>Renews</dt>
                <dd>{formatWhen(org.subscription?.currentPeriodEnd)}</dd>
              </div>
            </dl>
          </section>
        ))}

        <section className="account-history">
          <h2>Payment history</h2>
          {!loading && (account?.payments.length ?? 0) === 0 ? (
            <p className="account-muted">
              {canSeePayments || openOrgs.length === 0
                ? 'No payments yet.'
                : 'Payment history is visible to the account owner.'}
            </p>
          ) : (
            <ul>
              {(account?.payments ?? []).map((payment) => (
                <li key={payment.id}>
                  <div>
                    <strong>{eventLabel(payment.eventType)}</strong>
                    <span>{formatWhen(payment.createdAt)}</span>
                  </div>
                  <div>
                    <strong>{formatPaise(payment.amountPaise)}</strong>
                    <span>{payment.status ?? '—'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button type="button" className="account-signout" onClick={() => void signOut()}>
          Log out
        </button>
      </div>
    </main>
  );
}
