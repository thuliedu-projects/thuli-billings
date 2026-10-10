import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { PLANS, formatInr, type Plan, type PlanCode } from '../data/plans';
import { useScrollReveal } from '../hooks/useScrollReveal';
import './Pricing.css';

type CellValue = boolean | string;

type CompareRow = {
  label: string;
  values: Record<PlanCode, CellValue>;
};

type CompareSection = {
  title: string;
  rows: CompareRow[];
};

function productsLabel(plan: Plan): string {
  const n = plan.entitlements.maxProducts;
  return n == null ? 'Unlimited' : String(n);
}

function buildCompareSections(plans: Plan[]): CompareSection[] {
  const byCode = Object.fromEntries(plans.map((p) => [p.code, p])) as Record<PlanCode, Plan>;

  const bool = (pick: (p: Plan) => boolean): Record<PlanCode, CellValue> => ({
    starter: pick(byCode.starter),
    growth: pick(byCode.growth),
    pro: pick(byCode.pro),
  });

  const text = (pick: (p: Plan) => string): Record<PlanCode, CellValue> => ({
    starter: pick(byCode.starter),
    growth: pick(byCode.growth),
    pro: pick(byCode.pro),
  });

  return [
    {
      title: 'Billing',
      rows: [
        { label: 'Fast POS billing', values: bool(() => true) },
        { label: 'Offline POS', values: bool(() => true) },
        { label: 'Printer connection', values: bool(() => true) },
        { label: 'Invoices', values: bool((p) => p.entitlements.invoices) },
      ],
    },
    {
      title: 'Catalog',
      rows: [
        { label: 'Max products', values: text(productsLabel) },
        { label: 'Stock & inventory', values: bool(() => true) },
      ],
    },
    {
      title: 'Team & stores',
      rows: [
        {
          label: 'Stores',
          values: text((p) => String(p.entitlements.maxStores)),
        },
        {
          label: 'Staff',
          values: text((p) => String(p.entitlements.maxStaff)),
        },
      ],
    },
    {
      title: 'Insights & support',
      rows: [
        { label: 'Analytics', values: bool((p) => p.entitlements.analytics) },
        {
          label: 'Priority support',
          values: bool((p) => p.entitlements.prioritySupport),
        },
      ],
    },
  ];
}

const COMPARE_SECTIONS = buildCompareSections(PLANS);

function FeatureIcon({ included }: { included: boolean }) {
  return (
    <span
      className={`compare-icon${included ? ' included' : ' excluded'}`}
      aria-hidden="true"
    >
      {included ? <Check size={14} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
    </span>
  );
}

function Cell({ value }: { value: CellValue }) {
  if (typeof value === 'boolean') {
    return (
      <>
        <FeatureIcon included={value} />
        <span className="sr-only">{value ? 'Included' : 'Not included'}</span>
      </>
    );
  }
  return <span className="compare-value">{value}</span>;
}

export function Pricing() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PlanCode>('growth');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  function goCheckout(code: PlanCode) {
    setSelected(code);
    navigate(`/checkout?plan=${code}`);
  }

  return (
    <section
      ref={ref}
      className={`pricing scroll-reveal${isVisible ? ' is-visible' : ''}`}
      id="pricing"
      aria-labelledby="pricing-heading"
    >
      <div className="pricing-inner">
        <p className="pricing-eyebrow">Plans</p>
        <h2 id="pricing-heading">Choose a plan &amp; pay with your mobile</h2>
        <p className="pricing-lead">
          After payment, sign in on the THULI Billings app with the same number — you become the
          organization owner.
        </p>

        <div className="compare-scroll">
          <div className="compare-table" role="table" aria-label="Plan feature comparison">
            <div className="compare-row compare-headers" role="row">
              <div className="compare-feature-col" role="columnheader" />
              {PLANS.map((p) => {
                const active = p.code === selected;
                return (
                  <div
                    key={p.code}
                    className={`compare-plan-head${active ? ' active' : ''}${p.recommended ? ' recommended' : ''}`}
                    role="columnheader"
                  >
                    {p.recommended ? <span className="plan-badge">Recommended</span> : null}
                    <span className="plan-name">{p.name}</span>
                    <span className="plan-price">
                      {formatInr(p.priceInr)}
                      <small>/mo</small>
                    </span>
                    <p className="plan-blurb">{p.blurb}</p>
                    <button
                      type="button"
                      className={`plan-select${p.recommended ? ' featured' : ''}${active ? ' active' : ''}`}
                      onClick={() => goCheckout(p.code)}
                    >
                      Sign up
                    </button>
                  </div>
                );
              })}
            </div>

            {COMPARE_SECTIONS.map((section) => (
              <div key={section.title} className="compare-section">
                <div className="compare-row compare-section-title" role="row">
                  <div className="compare-feature-col" role="cell">
                    <strong>{section.title}</strong>
                  </div>
                  {PLANS.map((p) => (
                    <div key={p.code} className="compare-cell" role="cell" />
                  ))}
                </div>
                {section.rows.map((row) => (
                  <div key={row.label} className="compare-row" role="row">
                    <div className="compare-feature-col" role="rowheader">
                      {row.label}
                    </div>
                    {PLANS.map((p) => (
                      <div key={p.code} className="compare-cell" role="cell">
                        <Cell value={row.values[p.code]} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="pricing-checkout-link">
          Ready to subscribe?{' '}
          <Link to={`/checkout?plan=${selected}`}>Go to checkout</Link>
        </p>
      </div>
    </section>
  );
}
