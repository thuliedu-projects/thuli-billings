import { useState } from 'react';
import { Link } from 'react-router-dom';

import { entitlementFeatures } from '../../data/plans';
import {
  renameOrganization,
  subscriptionIsActive,
  subscriptionStatusLabel,
  type AccountOrg,
  type AccountSnapshot,
  type AccountStore,
  type CatalogPlan,
} from '../../lib/account';
import { formatPaise, formatWhen } from '../../lib/money';
import type { AccountTab } from './tabs';

type Props = {
  org: AccountOrg | null;
  snapshot: AccountSnapshot;
  stores: AccountStore[];
  plan: CatalogPlan | null;
  staffSeats: number;
  paid: boolean;
  justPaid: boolean;
  onOpenTab: (tab: AccountTab) => void;
  onReload: () => Promise<void>;
};

export function OverviewTab({
  org,
  snapshot,
  stores,
  plan,
  staffSeats,
  paid,
  justPaid,
  onOpenTab,
  onReload,
}: Props) {
  const activeStores = stores.filter((store) => store.isActive).length;
  const features = plan ? entitlementFeatures(plan.entitlements) : [];
  const included = features.filter((feature) => feature.included);
  const missing = features.filter((feature) => !feature.included);
  const renews = org?.subscription?.currentPeriodEnd ?? null;
  const days = daysRemaining(renews);
  const payments = snapshot.payments.slice(0, 3);

  return (
    <div className="dash-stack">
      {justPaid ? (
        <p className="account-banner" role="status">
          Payment recorded. Sign in on the app with this number to start billing.
        </p>
      ) : null}

      {!paid ? (
        <section className="dash-callout">
          <h2>Payment required</h2>
          <p>Pay for a plan to unlock the mobile app and create stores. Until then, sign-in on the app asks you to pay.</p>
          <Link className="dash-button" to="/checkout">
            Choose a plan
          </Link>
        </section>
      ) : null}

      {org ? (
        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <p className="dash-kicker">Business</p>
              <BusinessName org={org} onReload={onReload} />
            </div>
            <span className={`dash-pill${paid ? ' is-good' : ''}`}>
              {org.subscription ? subscriptionStatusLabel(org.subscription.status) : 'Unpaid'}
            </span>
          </div>
          <p className="dash-note">
            You are the {org.role}. Bills, stock, and day-to-day sales stay in the mobile app. This dashboard is for
            your plan, stores, and payments.
          </p>
          <dl className="dash-stats">
            <div>
              <dt>Plan</dt>
              <dd>{plan?.name ?? org.subscription?.plan?.name ?? 'No plan'}</dd>
              <span>{plan ? `${formatPaise(plan.pricePaise)} / ${plan.interval}` : '—'}</span>
            </div>
            <div>
              <dt>Stores</dt>
              <dd>
                {stores.length}
                {plan ? ` of ${plan.entitlements.maxStores}` : ''}
              </dd>
              <span>{activeStores} open</span>
            </div>
            <div>
              <dt>Staff seats</dt>
              <dd>
                {staffSeats}
                {plan ? ` of ${plan.entitlements.maxStaff}` : ''}
              </dd>
              <span>Besides the owner</span>
            </div>
            <div>
              <dt>Renews</dt>
              <dd>{formatWhen(renews)}</dd>
              <span>{days == null ? '—' : days === 1 ? '1 day left' : `${days} days left`}</span>
            </div>
          </dl>
        </section>
      ) : null}

      {plan ? (
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>On your plan</h2>
            <button type="button" className="dash-text-button" onClick={() => onOpenTab('plan')}>
              Compare plans
            </button>
          </div>
          <ul className="dash-chips">
            {included.map((feature) => (
              <li key={feature.label}>{feature.label}</li>
            ))}
          </ul>
          {missing.length > 0 ? (
            <p className="dash-note">Not included: {missing.map((feature) => feature.label).join(', ')}.</p>
          ) : (
            <p className="dash-note">This plan includes analytics, invoices, and priority support.</p>
          )}
        </section>
      ) : null}

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Stores</h2>
          <button type="button" className="dash-text-button" onClick={() => onOpenTab('stores')}>
            {stores.length === 0 ? 'Add a store' : 'Manage stores'}
          </button>
        </div>
        {stores.length === 0 ? (
          <p className="dash-note">
            No stores yet. A store is a counter or shop under this business. Its name, address, and GSTIN are printed
            on bills.
          </p>
        ) : (
          <ul className="dash-store-mini">
            {stores.map((store) => (
              <li key={store.id}>
                <strong>{store.name}</strong>
                <span>{store.isActive ? 'Open' : 'Paused'}</span>
                <span>{store.address || store.gstin || 'No address yet'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Recent payments</h2>
          <button type="button" className="dash-text-button" onClick={() => onOpenTab('billing')}>
            Billing
          </button>
        </div>
        {payments.length === 0 ? (
          <p className="dash-note">No payments yet.</p>
        ) : (
          <ul className="dash-payments">
            {payments.map((payment) => (
              <li key={payment.id}>
                <div>
                  <strong>{payment.planCode ? `${payment.planCode} plan` : 'Payment'}</strong>
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
    </div>
  );
}

function BusinessName({ org, onReload }: { org: AccountOrg; onReload: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canRename = org.role === 'owner';

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      await renameOrganization(org.id, name);
      await onReload();
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not rename the business.');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="dash-business-name">
        <h2>{org.name}</h2>
        {canRename ? (
          <button
            type="button"
            className="dash-text-button"
            onClick={() => {
              setName(org.name);
              setEditing(true);
            }}
          >
            Rename
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="dash-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <label className="sr-only" htmlFor="business-name">
        Business name
      </label>
      <input id="business-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      <button type="submit" className="dash-button" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="dash-text-button" onClick={() => setEditing(false)}>
        Cancel
      </button>
      {error ? <p className="account-error">{error}</p> : null}
    </form>
  );
}

function daysRemaining(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  if (!subscriptionIsActive({ status: 'active', currentPeriodStart: null, currentPeriodEnd: iso, plan: null })) {
    return 0;
  }
  return Math.ceil((end - Date.now()) / 86_400_000);
}
