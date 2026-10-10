import { BrandLogo } from './BrandLogo';
import { useScrollReveal } from '../hooks/useScrollReveal';
import './Footer.css';

export function Footer() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <footer ref={ref} className={`site-footer scroll-reveal${isVisible ? ' is-visible' : ''}`}>
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <BrandLogo className="site-footer-logo" decorative />
          <div>
            <strong>THULI Billings</strong>
            <span>That&apos;s How U Learn It</span>
          </div>
        </div>
        <p>
          Pay on this website with your mobile number. Then open the app, sign in with OTP on the
          same number, and start billing — you are the organization owner.
        </p>
        <p className="site-footer-copy">© {new Date().getFullYear()} THULI Billings</p>
      </div>
    </footer>
  );
}
