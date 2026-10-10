import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { entitlementFeatures } from '../../data/plans';
import { subscriptionIsActive, type AccountOrg, type CatalogPlan } from '../../lib/account';
import { formatPaise } from '../../lib/money';

type Props = {
  org: AccountOrg | null;
  plans: CatalogPlan[];
  currentCode: string | null;
};

export function PlanTab({ org, plans, currentCode }: Props) {
  const current = plans.find((plan) => plan.code === currentCode) ?? null;
  const paid = subscriptionIsActive(org?.subscription ?? null);

  return (
    <div className="dash-stack">
      <section className="dash-panel">
        <p className="dash-kicker">Your plan</p>
        <h2>{current ? current.name : 'No plan yet'}</h2>
        <p className="dash-note">
          {current
            ? `${current.blurb} Staff seats are for people you invite. The owner does not use a seat.`
            : 'Pick a plan to unlock the app, stores, and billing.'}
        </p>
        {current ? (
          <ul className="dash-feature-list">
            {entitlementFeatures(current.entitlements).map((feature) => (
              <li key={feature.label} className={feature.included ? 'is-on' : 'is-off'}>
                {feature.included ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                {feature.label}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="dash-plan-grid">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentCode && paid;
          return (
            <article key={plan.code} className={`dash-plan-card${isCurrent ? ' is-current' : ''}${plan.recommended ? ' is-recommended' : ''}`}>
              {plan.recommended ? <span className="dash-plan-badge">Recommended</span> : null}
              <h3>{plan.name}</h3>
              <p className="dash-plan-price">
                {formatPaise(plan.pricePaise)}
                <small>/{plan.interval}</small>
              </p>
              <p className="dash-note">{plan.blurb}</p>
              <ul className="dash-feature-list">
                {entitlementFeatures(plan.entitlements).map((feature) => (
                  <li key={feature.label} className={feature.included ? 'is-on' : 'is-off'}>
                    {feature.included ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                    {feature.label}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="dash-current-label">Current plan</p>
              ) : (
                <Link className="dash-button" to={`/checkout?plan=${plan.code}`}>
                  {paid ? `Pay for ${plan.name}` : `Choose ${plan.name}`}
                </Link>
              )}
            </article>
          );
        })}
      </div>
      {paid ? (
        <p className="dash-note">
          Paying for another plan switches this business to that plan and adds one billing period onto the time you
          already have.
        </p>
      ) : null}
    </div>
  );
}
