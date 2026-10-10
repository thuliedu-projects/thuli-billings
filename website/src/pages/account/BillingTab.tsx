import { formatPaise, formatWhen } from '../../lib/money';
import {
  subscriptionIsActive,
  subscriptionStatusLabel,
  type AccountOrg,
  type AccountSnapshot,
  type CatalogPlan,
} from '../../lib/account';
import type { AccountTab } from './tabs';

type Props = {
  org: AccountOrg | null;
  snapshot: AccountSnapshot;
  plan: CatalogPlan | null;
  canSeePayments: boolean;
  onOpenTab: (tab: AccountTab) => void;
};

export function BillingTab({ org, snapshot, plan, canSeePayments, onOpenTab }: Props) {
  const paid = subscriptionIsActive(org?.subscription ?? null);
  const renews = org?.subscription?.currentPeriodEnd ?? null;

  return (
    <div className="dash-stack">
      <section className="dash-panel">
        <p className="dash-kicker">Subscription</p>
        <h2>{plan?.name ?? 'No plan'}</h2>
        <dl className="dash-stats">
          <div>
            <dt>Status</dt>
            <dd>{org?.subscription ? subscriptionStatusLabel(org.subscription.status) : 'Unpaid'}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{plan ? formatPaise(plan.pricePaise) : '—'}</dd>
            <span>{plan ? `per ${plan.interval}` : ''}</span>
          </div>
          <div>
            <dt>Current period</dt>
            <dd>{formatWhen(org?.subscription?.currentPeriodStart)}</dd>
            <span>Started</span>
          </div>
          <div>
            <dt>{paid ? 'Renews' : 'Ended'}</dt>
            <dd>{formatWhen(renews)}</dd>
          </div>
        </dl>
        <button type="button" className="dash-text-button" onClick={() => onOpenTab('plan')}>
          {paid ? 'Change plan' : 'Choose a plan'}
        </button>
      </section>

      <section className="dash-panel">
        <h2>Payment history</h2>
        {!canSeePayments ? (
          <p className="dash-note">Payment history is visible to the owner and admins.</p>
        ) : snapshot.payments.length === 0 ? (
          <p className="dash-note">No payments yet.</p>
        ) : (
          <ul className="dash-payments">
            {snapshot.payments.map((payment) => (
              <li key={payment.id}>
                <div>
                  <strong>{payment.planCode ? `${titlePlan(payment.planCode)} plan` : 'Payment'}</strong>
                  <span>{formatWhen(payment.createdAt)}</span>
                  {payment.paymentId ? <span className="dash-mono">{payment.paymentId}</span> : null}
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

function titlePlan(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}
