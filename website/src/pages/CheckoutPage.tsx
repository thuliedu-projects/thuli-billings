import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from '../components/BrandLogo';
import { PhoneOtpForm } from '../components/PhoneOtpForm';
import { type PlanCode } from '../data/plans';
import { loadCatalogPlans, localCatalogPlans, type CatalogPlan } from '../lib/account';
import { functionErrorMessage } from '../lib/functions';
import { formatPaise } from '../lib/money';
import { formatIndiaPhone } from '../lib/phone';
import { openRazorpay } from '../lib/razorpay';
import { supabase } from '../lib/supabase';
import './CheckoutPage.css';

function isPlanCode(value: string | null): value is PlanCode {
  return value === 'starter' || value === 'growth' || value === 'pro';
}

export function CheckoutPage() {
  const { ready, session, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const planParam = params.get('plan');
  const [catalog, setCatalog] = useState<CatalogPlan[]>(() => localCatalogPlans());
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const selected = isPlanCode(planParam) ? planParam : (catalog.find((item) => item.recommended)?.code ?? 'growth');
  const plan = useMemo(() => catalog.find((item) => item.code === selected) ?? null, [catalog, selected]);
  const phoneLabel = formatIndiaPhone(session?.user.phone);

  useEffect(() => {
    let active = true;
    void loadCatalogPlans().then((next) => {
      if (active && next.length) setCatalog(next);
    });
    return () => {
      active = false;
    };
  }, []);

  function setPlan(code: string) {
    setParams({ plan: code }, { replace: true });
    setError('');
    setPaid(false);
  }

  async function onPay() {
    if (!supabase || !session || !plan || !isPlanCode(plan.code)) return;
    setPaying(true);
    setError('');
    setPaid(false);
    const { data, error: startError } = await supabase.functions.invoke('create-razorpay-order', {
      body: { planCode: selected },
    });
    if (startError || !data?.orderId || !data?.keyId) {
      setError(startError ? await functionErrorMessage(startError) : 'Could not start payment');
      setPaying(false);
      return;
    }

    try {
      const response = await openRazorpay({
        keyId: data.keyId as string,
        orderId: data.orderId as string,
        amount: data.amount as number,
        currency: (data.currency as string) || 'INR',
        description: `${data.planName ?? plan?.name} plan`,
        contact: (data.phone as string) || session.user.phone || '',
      });
      const { error: confirmError } = await supabase.functions.invoke('confirm-razorpay-payment', {
        body: response,
      });
      if (confirmError) {
        setError(await functionErrorMessage(confirmError));
        setPaying(false);
        return;
      }
      setPaid(true);
    } catch (payError) {
      const message = payError instanceof Error ? payError.message : 'Payment failed';
      if (message !== 'Payment cancelled') setError(message);
      else setError('Payment cancelled');
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <BrandLogo className="checkout-logo" />
        <div className="checkout-gold-rule" aria-hidden="true" />
        <h1>Sign up &amp; checkout</h1>
        <p className="checkout-sub">
          Verify your mobile number, then pay. That number becomes the organization owner and can
          sign in on the app.
        </p>

        <div className="checkout-plans" role="radiogroup" aria-label="Choose a plan">
          {catalog.map((item) => {
            const active = item.code === selected;
            return (
              <button
                key={item.code}
                type="button"
                role="radio"
                aria-checked={active}
                className={`checkout-plan-option${active ? ' active' : ''}${item.recommended ? ' recommended' : ''}`}
                onClick={() => setPlan(item.code)}
              >
                {item.recommended ? <span className="checkout-plan-badge">Recommended</span> : null}
                <span className="checkout-plan-name">{item.name}</span>
                <span className="checkout-plan-price">
                  {formatPaise(item.pricePaise)}
                  <small>/mo</small>
                </span>
                <span className="checkout-plan-blurb">{item.blurb}</span>
              </button>
            );
          })}
        </div>

        {!ready ? null : !plan ? (
          <p className="checkout-error" role="alert">
            That plan is not available. Choose another.
          </p>
        ) : session ? (
          <div className="checkout-form">
            <p className="checkout-paying">
              Paying for <strong>{plan.name}</strong> — {formatPaise(plan.pricePaise)}/month
            </p>
            <p className="checkout-signed-in">
              Signed in as <strong>{phoneLabel || 'your mobile'}</strong>
              {' · '}
              <button type="button" className="checkout-linkish" onClick={() => void signOut()}>
                Use a different number
              </button>
            </p>
            <button type="button" className="checkout-pay" disabled={paying || !isPlanCode(plan.code)} onClick={() => void onPay()}>
              {paying ? 'Opening payment…' : `Pay ${formatPaise(plan.pricePaise)}`}
            </button>
            {error ? (
              <p className="checkout-error" role="alert">
                {error}
              </p>
            ) : null}
            {paid ? (
              <p className="checkout-success" role="status">
                Payment recorded. You can <Link to="/account">open your dashboard</Link> and sign
                in to the app with {phoneLabel || 'this number'}.
              </p>
            ) : (
              <p className="checkout-note">
                Razorpay opens next. The app stays locked until this payment is saved.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="checkout-paying">
              Paying for <strong>{plan.name}</strong> — {formatPaise(plan.pricePaise)}/month
            </p>
            <PhoneOtpForm
              onVerified={() => setError('')}
              footer={
                <>
                  Already subscribed? <Link to="/login">Log in</Link>
                </>
              }
            />
          </>
        )}

        <p className="checkout-footer-note">
          <Link to="/#pricing">Compare plans</Link>
        </p>
      </div>
    </main>
  );
}
