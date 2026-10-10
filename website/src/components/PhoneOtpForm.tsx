import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import { toIndiaPhone } from '../lib/phone';
import { supabase } from '../lib/supabase';
import './AuthPage.css';

const RESEND_SECONDS = 60;

type PhoneOtpFormProps = {
  onVerified: () => void;
  footer?: ReactNode;
};

export function PhoneOtpForm({ onVerified, footer }: PhoneOtpFormProps) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [phase, setPhase] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  async function sendOtp(e?: FormEvent) {
    e?.preventDefault();
    const phone = toIndiaPhone(mobile);
    if (!phone) {
      setError('Enter a valid 10-digit Indian mobile number');
      setInfo('');
      return;
    }
    if (!supabase) {
      setError('Sign-in is not configured');
      return;
    }
    setBusy(true);
    setError('');
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setPhase('otp');
    setSecondsLeft(RESEND_SECONDS);
    setInfo(`Code sent on WhatsApp to +91 ${mobile}`);
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    const phone = toIndiaPhone(mobile);
    if (!phone || !supabase) return;
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setBusy(true);
    setError('');
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    onVerified();
  }

  if (phase === 'otp') {
    return (
      <form className="auth-form" onSubmit={(e) => void verifyOtp(e)} noValidate>
        <p className="auth-note success">{info}</p>
        <label htmlFor="auth-otp">WhatsApp OTP</label>
        <div className={`auth-field${error ? ' invalid' : ''}`}>
          <input
            id="auth-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(ev) => {
              setOtp(ev.target.value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
          />
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Checking…' : 'Verify OTP'}
        </button>
        <p className="auth-note">
          {secondsLeft > 0 ? (
            `Resend in 00:${String(secondsLeft).padStart(2, '0')}`
          ) : (
            <button type="button" className="auth-text-button" onClick={() => void sendOtp()} disabled={busy}>
              Resend code
            </button>
          )}
          {' · '}
          <button
            type="button"
            className="auth-text-button"
            onClick={() => {
              setPhase('phone');
              setOtp('');
              setError('');
              setInfo('');
            }}
          >
            Edit number
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={(e) => void sendOtp(e)} noValidate>
      <label htmlFor="auth-mobile">Mobile number</label>
      <div className={`auth-field${error ? ' invalid' : ''}`}>
        <span>+91</span>
        <input
          id="auth-mobile"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit mobile"
          value={mobile}
          onChange={(ev) => {
            setMobile(ev.target.value.replace(/\D/g, '').slice(0, 10));
            setError('');
          }}
        />
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Sending…' : 'Send OTP'}
      </button>
      {footer ? <div className="auth-note">{footer}</div> : null}
    </form>
  );
}
