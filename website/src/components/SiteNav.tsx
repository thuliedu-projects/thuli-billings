import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from './BrandLogo';
import './SiteNav.css';

export function SiteNav() {
  const { session } = useAuth();

  return (
    <nav className="site-nav" aria-label="Account">
      <div className="site-nav-inner">
        <div className="site-nav-left">
          <Link to="/" className="site-nav-home">
            <BrandLogo className="site-nav-logo" decorative />
            <span>Billings</span>
          </Link>
          <div className="site-nav-auth">
            {session ? (
              <NavLink to="/account" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Account
              </NavLink>
            ) : (
              <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Log in
              </NavLink>
            )}
          </div>
        </div>
        <a className="site-nav-cta" href="/#pricing">
          Pricing
        </a>
      </div>
    </nav>
  );
}
