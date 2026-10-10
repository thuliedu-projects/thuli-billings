import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from '../components/BrandLogo';
import {
  loadAccount,
  subscriptionIsActive,
  type AccountSnapshot,
} from '../lib/account';
import { formatIndiaPhone } from '../lib/phone';
import { BillingTab } from './account/BillingTab';
import { OverviewTab } from './account/OverviewTab';
import { PlanTab } from './account/PlanTab';
import { StoresTab } from './account/StoresTab';
import { isAccountTab, type AccountTab } from './account/tabs';
import './AccountPage.css';

const TAB_LABELS: { id: AccountTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'stores', label: 'Stores' },
  { id: 'billing', label: 'Billing' },
];

export function AccountPage() {
  const { ready, session, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState('');

  const userId = session?.user.id;
  const tabParam = params.get('tab');
  const tab: AccountTab = isAccountTab(tabParam) ? tabParam : 'overview';

  function applySnapshot(snapshot: AccountSnapshot) {
    setAccount(snapshot);
    setError('');
    setOrgId((current) => {
      const open = snapshot.orgs.filter((item) => !item.closedAt);
      if (open.some((item) => item.id === current)) return current;
      return open[0]?.id ?? '';
    });
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    void loadAccount(userId)
      .then((snapshot) => {
        if (active) applySnapshot(snapshot);
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

  function openTab(next: AccountTab) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('tab', next);
    setParams(nextParams, { replace: true });
  }

  if (!ready) return <main className="account-page" />;
  if (!session) return <Navigate to="/login" replace />;

  const openOrgs = (account?.orgs ?? []).filter((org) => !org.closedAt);
  const org = openOrgs.find((item) => item.id === orgId) ?? openOrgs[0] ?? null;
  const stores = (account?.stores ?? []).filter((store) => store.orgId === org?.id);
  const plan =
    account?.plans.find((item) => item.code === org?.subscription?.plan?.code) ?? null;
  const paid = subscriptionIsActive(org?.subscription ?? null);
  const canSeePayments = org?.role === 'owner' || org?.role === 'admin' || openOrgs.length === 0;
  const phone = formatIndiaPhone(session.user.phone);

  return (
    <main className="account-page">
      <div className="account-shell">
        <header className="account-head">
          <div className="account-head-brand">
            <BrandLogo className="account-logo" />
            <div>
              <p className="dash-kicker">Dashboard</p>
              <h1>{org?.name ?? 'Your account'}</h1>
              <p className="account-sub">{phone || 'Signed in'}</p>
            </div>
          </div>
          <div className="account-head-actions">
            {openOrgs.length > 1 ? (
              <label className="account-org-switch">
                <span className="sr-only">Business</span>
                <select value={org?.id ?? ''} onChange={(event) => setOrgId(event.target.value)}>
                  {openOrgs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="button" className="account-signout" onClick={() => void signOut()}>
              Log out
            </button>
          </div>
        </header>

        <div className="account-tabs" role="tablist" aria-label="Dashboard">
          {TAB_LABELS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              className="account-tab"
              onClick={() => openTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? <p className="dash-note">Loading your dashboard…</p> : null}
        {error ? (
          <p className="account-error" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && account && org !== undefined ? (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'overview' ? (
              <OverviewTab
                org={org}
                snapshot={account}
                stores={stores}
                plan={plan}
                staffSeats={org ? (account.staffSeatsByOrg[org.id] ?? 0) : 0}
                paid={paid}
                justPaid={params.get('paid') === '1'}
                onOpenTab={openTab}
                onReload={async () => {
                  if (userId) applySnapshot(await loadAccount(userId));
                }}
              />
            ) : null}
            {tab === 'plan' ? <PlanTab org={org} plans={account.plans} currentCode={plan?.code ?? null} /> : null}
            {tab === 'stores' ? (
              <StoresTab
                org={org}
                stores={stores}
                plan={plan}
                onOpenTab={openTab}
                onReload={async () => {
                  if (userId) applySnapshot(await loadAccount(userId));
                }}
              />
            ) : null}
            {tab === 'billing' ? (
              <BillingTab
                org={org}
                snapshot={account}
                plan={plan}
                canSeePayments={canSeePayments}
                onOpenTab={openTab}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
