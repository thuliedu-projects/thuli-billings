import { BrandLogo } from './BrandLogo';
import { PhoneMockup } from './PhoneMockup';
import './Hero.css';

export function Hero() {
  return (
    <header className="hero">
      <div className="hero-atmosphere" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-brand">
            <BrandLogo className="hero-logo" />
            <span className="hero-wordmark">B i l l i n g s</span>
          </div>
          <div className="hero-gold-rule" aria-hidden="true" />
          <h1 className="hero-headline">Billing that keeps up with your counter</h1>
          <p className="hero-support">
            Fast offline POS for Indian stores. Subscribe here, then sign in on the app with the same
            mobile number.
          </p>
          <a className="hero-cta" href="/checkout?plan=growth">
            Get started
          </a>
        </div>
        <div className="hero-visual">
          <PhoneMockup />
        </div>
      </div>
    </header>
  );
}
