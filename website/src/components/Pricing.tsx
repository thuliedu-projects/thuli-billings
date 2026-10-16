import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { useScrollReveal } from '../hooks/useScrollReveal';
import { loadCatalogPlans, localCatalogPlans, type CatalogPlan } from '../lib/account';
import { formatPaise } from '../lib/money';
import './Pricing.css';

type CellValue = boolean | string;

type CompareRow = {
  label: string;
  values: Record<string, CellValue>;
};

type CompareSection = {
  title: string;
  rows: CompareRow[];
};

function productsLabel(plan: CatalogPlan): string {
  const n = plan.entitlements.maxProducts;
  return n == null ? 'Unlimited' : String(n);
}

function buildCompareSections(plans: CatalogPlan[]): CompareSection[] {
  const values = (pick: (plan: CatalogPlan) => CellValue): Record<string, CellValue> =>
    Object.fromEntries(plans.map((plan) => [plan.code, pick(plan)]));

  return [
    {
      title: 'Billing',
      rows: [
        { label: 'Fast POS billing', values: values(() => true) },
        { label: 'Offline POS', values: values(() => true) },
        { label: 'Printer connection', values: values(() => true) },
        { label: 'Invoices', values: values((plan) => plan.entitlements.invoices) },
      ],
    },
    {
      title: 'Catalog',
      rows: [
        { label: 'Max products', values: values(productsLabel) },
        { label: 'Stock & inventory', values: values(() => true) },
      ],
    },
    {
      title: 'Team & stores',
      rows: [
        {
          label: 'Stores',
          values: values((plan) => String(plan.entitlements.maxStores)),
        },
        {
          label: 'Staff',
          values: values((plan) => String(plan.entitlements.maxStaff)),
        },
      ],
    },
    {
      title: 'Insights & support',
      rows: [
        { label: 'Analytics', values: values((plan) => plan.entitlements.analytics) },
        {
          label: 'Priority support',
          values: values((plan) => plan.entitlements.prioritySupport),
        },
      ],
    },
  ];
}

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
  const [plans, setPlans] = useState<CatalogPlan[]>(() => localCatalogPlans());
  const [selected, setSelected] = useState('growth');
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const sections = buildCompareSections(plans);
  const rowStyle = {
    gridTemplateColumns: `minmax(180px, 1.2fr) repeat(${Math.max(plans.length, 1)}, minmax(140px, 1fr))`,
  };

  useEffect(() => {
    let active = true;
    void loadCatalogPlans().then((next) => {
      if (!active || !next.length) return;
      setPlans(next);
      setSelected((current) =>
        next.some((plan) => plan.code === current) ? current : (next.find((plan) => plan.recommended)?.code ?? next[0].code),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  function goCheckout(code: string) {
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
            <div className="compare-row compare-headers" role="row" style={rowStyle}>
              <div className="compare-feature-col" role="columnheader" />
              {plans.map((p) => {
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
                      {formatPaise(p.pricePaise)}
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

            {sections.map((section) => (
              <div key={section.title} className="compare-section">
                <div className="compare-row compare-section-title" role="row" style={rowStyle}>
                  <div className="compare-feature-col" role="cell">
                    <strong>{section.title}</strong>
                  </div>
                  {plans.map((p) => (
                    <div key={p.code} className="compare-cell" role="cell" />
                  ))}
                </div>
                {section.rows.map((row) => (
                  <div key={row.label} className="compare-row" role="row" style={rowStyle}>
                    <div className="compare-feature-col" role="rowheader">
                      {row.label}
                    </div>
                    {plans.map((p) => (
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
