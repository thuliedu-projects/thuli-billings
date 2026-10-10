import { useState } from 'react';

import {
  createStore,
  subscriptionIsActive,
  updateStore,
  type AccountOrg,
  type AccountStore,
  type CatalogPlan,
  type StoreInput,
} from '../../lib/account';
import { formatIndiaPhone } from '../../lib/phone';
import { formatWhen } from '../../lib/money';
import type { AccountTab } from './tabs';

const EMPTY_DRAFT: StoreInput = {
  name: '',
  phone: '',
  address: '',
  gstin: '',
  isActive: true,
};

type Props = {
  org: AccountOrg | null;
  stores: AccountStore[];
  plan: CatalogPlan | null;
  onOpenTab: (tab: AccountTab) => void;
  onReload: () => Promise<void>;
};

export function StoresTab({ org, stores, plan, onOpenTab, onReload }: Props) {
  const [adding, setAdding] = useState(false);
  const limit = plan?.entitlements.maxStores ?? 0;
  const used = stores.length;
  const paid = subscriptionIsActive(org?.subscription ?? null);
  const canManage = org?.role === 'owner' || org?.role === 'admin';
  const atLimit = limit > 0 && used >= limit;
  const width = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="dash-stack">
      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <p className="dash-kicker">Stores</p>
            <h2>
              {used}
              {limit > 0 ? ` of ${limit}` : ''}
            </h2>
          </div>
          {canManage && paid && !atLimit ? (
            <button type="button" className="dash-button" onClick={() => setAdding((open) => !open)}>
              {adding ? 'Close' : 'Add a store'}
            </button>
          ) : null}
        </div>
        {limit > 0 ? (
          <div className="dash-meter" aria-hidden="true">
            <span style={{ width: `${width}%` }} />
          </div>
        ) : null}
        <p className="dash-note">
          A store is one shop or counter. The app bills against a store, and the store name, address, and GSTIN are
          copied onto each bill. Paused stores still count toward the plan limit. Timezone is Asia/Kolkata.
        </p>
        {!paid ? (
          <p className="dash-note">
            An active plan is required before you can add a store.{' '}
            <button type="button" className="dash-text-button" onClick={() => onOpenTab('plan')}>
              View plans
            </button>
          </p>
        ) : null}
        {paid && atLimit ? (
          <p className="dash-note">
            {plan?.name ?? 'This plan'} includes {limit === 1 ? '1 store' : `${limit} stores`}.{' '}
            <button type="button" className="dash-text-button" onClick={() => onOpenTab('plan')}>
              See larger plans
            </button>
          </p>
        ) : null}
        {!canManage && org ? <p className="dash-note">Only the owner or an admin can change store details.</p> : null}
      </section>

      {adding && org && canManage ? (
        <section className="dash-panel">
          <h2>New store</h2>
          <StoreForm
            initial={EMPTY_DRAFT}
            submitLabel="Create store"
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              await createStore(org.id, input);
              await onReload();
              setAdding(false);
            }}
          />
        </section>
      ) : null}

      {stores.length === 0 ? (
        <section className="dash-panel">
          <p className="dash-note">No stores yet. Add one here, then open the app and start billing.</p>
        </section>
      ) : (
        stores.map((store) => (
          <StoreCard key={store.id} store={store} canManage={canManage} orgId={org?.id ?? store.orgId} onReload={onReload} />
        ))
      )}
    </div>
  );
}

function StoreCard({
  store,
  canManage,
  orgId,
  onReload,
}: {
  store: AccountStore;
  canManage: boolean;
  orgId: string;
  onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className="dash-panel">
        <h2>Edit {store.name}</h2>
        <StoreForm
          initial={{
            name: store.name,
            phone: store.phone ?? '',
            address: store.address ?? '',
            gstin: store.gstin ?? '',
            isActive: store.isActive,
          }}
          submitLabel="Save store"
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await updateStore(store.id, orgId, input);
            await onReload();
            setEditing(false);
          }}
        />
      </section>
    );
  }

  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>{store.name}</h2>
          <p className="dash-note">Added {formatWhen(store.createdAt)}</p>
        </div>
        <span className={`dash-pill${store.isActive ? ' is-good' : ''}`}>{store.isActive ? 'Open' : 'Paused'}</span>
      </div>
      <dl className="dash-details">
        <div>
          <dt>Phone</dt>
          <dd>{store.phone ? formatIndiaPhone(store.phone) || store.phone : 'Not set'}</dd>
        </div>
        <div>
          <dt>GSTIN</dt>
          <dd>{store.gstin ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{store.address ?? 'Not set'}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{store.timezone}</dd>
        </div>
      </dl>
      {canManage ? (
        <button type="button" className="dash-text-button" onClick={() => setEditing(true)}>
          Edit details
        </button>
      ) : null}
    </section>
  );
}

function StoreForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: StoreInput;
  submitLabel: string;
  onSubmit: (input: StoreInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function setField(field: keyof StoreInput, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      await onSubmit(draft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the store.');
      setSaving(false);
    }
  }

  return (
    <form
      className="dash-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <label>
        Store name
        <input value={draft.name} maxLength={80} onChange={(event) => setField('name', event.target.value)} required />
      </label>
      <label>
        Phone
        <input
          value={draft.phone}
          maxLength={20}
          inputMode="tel"
          onChange={(event) => setField('phone', event.target.value)}
          placeholder="Counter phone, optional"
        />
      </label>
      <label>
        Address
        <textarea
          value={draft.address}
          maxLength={240}
          rows={3}
          onChange={(event) => setField('address', event.target.value)}
          placeholder="Printed on bills"
        />
      </label>
      <label>
        GSTIN
        <input
          value={draft.gstin}
          maxLength={15}
          onChange={(event) => setField('gstin', event.target.value.toUpperCase())}
          placeholder="15 characters, optional"
          spellCheck={false}
        />
      </label>
      <label className="dash-check">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) => setField('isActive', event.target.checked)}
        />
        Store is open for billing
      </label>
      {error ? (
        <p className="account-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dash-form-actions">
        <button type="submit" className="dash-button" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="dash-text-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
