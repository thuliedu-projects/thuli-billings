import { useEffect, useState } from 'react';

import { draftFromPlan, saveAdminPlan, type AdminPlan, type PlanDraft } from '../../lib/admin';

type Props = {
  plans: AdminPlan[];
  onSaved: () => Promise<void>;
};

export function PlansTab({ plans, onSaved }: Props) {
  const [drafts, setDrafts] = useState<PlanDraft[]>(() => plans.map(draftFromPlan));
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');

  useEffect(() => {
    setDrafts(plans.map(draftFromPlan));
  }, [plans]);

  function updateDraft(id: string, patch: Partial<PlanDraft>) {
    setSavedId('');
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id === id) return { ...draft, ...patch };
        if (patch.recommended) return { ...draft, recommended: false };
        return draft;
      }),
    );
  }

  async function onSave(draft: PlanDraft) {
    setSavingId(draft.id);
    setError('');
    setSavedId('');
    try {
      await saveAdminPlan(draft);
      await onSaved();
      setSavedId(draft.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the plan.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="dash-stack">
      <p className="dash-note">
        A new price applies to the next payment. Feature limits apply to current subscribers the next time they add a
        store, staff member, or product. Plan codes stay starter, growth, and pro.
      </p>
      {error ? (
        <p className="account-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dash-plan-grid">
        {drafts.map((draft) => (
          <form
            key={draft.id}
            className={`admin-plan-card${draft.recommended ? ' is-recommended' : ''}`}
            onSubmit={(event) => {
              event.preventDefault();
              void onSave(draft);
            }}
          >
            <p className="dash-kicker">{draft.code}</p>
            <label>
              Name
              <input value={draft.name} onChange={(event) => updateDraft(draft.id, { name: event.target.value })} />
            </label>
            <label>
              Price, ₹ / month
              <input
                inputMode="decimal"
                value={draft.priceInr}
                onChange={(event) => updateDraft(draft.id, { priceInr: event.target.value })}
              />
            </label>
            <label className="admin-span-2">
              Blurb
              <textarea
                rows={3}
                value={draft.blurb}
                onChange={(event) => updateDraft(draft.id, { blurb: event.target.value })}
              />
            </label>
            <label>
              Max stores
              <input
                inputMode="numeric"
                value={draft.maxStores}
                onChange={(event) => updateDraft(draft.id, { maxStores: event.target.value })}
              />
            </label>
            <label>
              Max staff
              <input
                inputMode="numeric"
                value={draft.maxStaff}
                onChange={(event) => updateDraft(draft.id, { maxStaff: event.target.value })}
              />
            </label>
            <label className="admin-span-2">
              Max products
              <input
                inputMode="numeric"
                placeholder="Empty means unlimited"
                value={draft.maxProducts}
                onChange={(event) => updateDraft(draft.id, { maxProducts: event.target.value })}
              />
            </label>
            <label className="dash-check">
              <input
                type="checkbox"
                checked={draft.analytics}
                onChange={(event) => updateDraft(draft.id, { analytics: event.target.checked })}
              />
              Analytics
            </label>
            <label className="dash-check">
              <input
                type="checkbox"
                checked={draft.invoices}
                onChange={(event) => updateDraft(draft.id, { invoices: event.target.checked })}
              />
              Invoices
            </label>
            <label className="dash-check">
              <input
                type="checkbox"
                checked={draft.prioritySupport}
                onChange={(event) => updateDraft(draft.id, { prioritySupport: event.target.checked })}
              />
              Priority support
            </label>
            <label className="dash-check">
              <input
                type="checkbox"
                checked={draft.recommended}
                onChange={(event) => updateDraft(draft.id, { recommended: event.target.checked })}
              />
              Recommended
            </label>
            <label className="dash-check">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => updateDraft(draft.id, { isActive: event.target.checked })}
              />
              Active on the website
            </label>
            <button type="submit" className="dash-button" disabled={savingId === draft.id}>
              {savingId === draft.id ? 'Saving…' : 'Save'}
            </button>
            {savedId === draft.id ? <p className="dash-note">Saved.</p> : null}
          </form>
        ))}
      </div>
    </div>
  );
}
