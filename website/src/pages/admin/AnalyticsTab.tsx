import { subscriptionStatusLabel } from '../../lib/account';
import type { PlatformSnapshot } from '../../lib/admin';
import { formatPaise, formatRupees, formatWhen } from '../../lib/money';
import { formatIndiaPhone } from '../../lib/phone';

type Props = {
  snapshot: PlatformSnapshot;
};

export function AnalyticsTab({ snapshot }: Props) {
  return (
    <div className="dash-stack">
      <section className="admin-stats" aria-label="Summary">
        <div>
          <p>Organizations</p>
          <strong>{snapshot.organizationCount}</strong>
        </div>
        <div>
          <p>Paying now</p>
          <strong>{snapshot.payingCount}</strong>
        </div>
        <div>
          <p>Catalog monthly total</p>
          <strong>{formatPaise(snapshot.mrrPaise)}</strong>
        </div>
        <div>
          <p>Collected, 30 days</p>
          <strong>{formatPaise(snapshot.collectedPaise30d)}</strong>
        </div>
        <div>
          <p>Synced sales, 30 days</p>
          <strong>{formatRupees(snapshot.paidBillTotal)}</strong>
          <span>
            {snapshot.paidBillCount30d} paid {snapshot.paidBillCount30d === 1 ? 'bill' : 'bills'}
          </span>
        </div>
      </section>

      <section className="dash-panel">
        <p className="dash-kicker">Plans</p>
        <h2>Who is paying</h2>
        <ul className="dash-chips">
          {snapshot.planMix.map((plan) => (
            <li key={plan.code}>
              {plan.name}: {plan.payingCount}
            </li>
          ))}
        </ul>
        <p className="dash-note">
          Paying now means an active or trial subscription whose period has not ended. Store sales include paid bills
          that have synced. Sales still on a phone are not included.
        </p>
      </section>

      <section className="dash-panel">
        <p className="dash-kicker">Customers</p>
        <h2>Every organization</h2>
        {snapshot.customers.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Period ends</th>
                  <th>Stores</th>
                  <th>Paid sales</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      {customer.name}
                      {customer.closedAt ? <span className="dash-pill">Closed</span> : null}
                    </td>
                    <td>{formatIndiaPhone(customer.phone) || '—'}</td>
                    <td>{customer.planName ?? '—'}</td>
                    <td>{customer.status ? subscriptionStatusLabel(customer.status) : '—'}</td>
                    <td>{formatWhen(customer.periodEnd)}</td>
                    <td>{customer.storeCount}</td>
                    <td>{formatRupees(customer.paidSales)}</td>
                    <td>{formatWhen(customer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="dash-note">No customers yet.</p>
        )}
      </section>

      <section className="dash-panel">
        <p className="dash-kicker">Payments</p>
        <h2>Recent captured payments</h2>
        {snapshot.recentPayments.length ? (
          <ul className="dash-payments">
            {snapshot.recentPayments.map((payment) => (
              <li key={payment.id}>
                <div>
                  <strong>{payment.planCode ?? 'Plan'}</strong>
                  <span>{formatIndiaPhone(payment.phone) || '—'}</span>
                </div>
                <div>
                  <strong>{formatPaise(payment.amountPaise)}</strong>
                  <span>{formatWhen(payment.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dash-note">No captured payments in the ledger yet.</p>
        )}
      </section>
    </div>
  );
}
