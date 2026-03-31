import {Link} from 'react-router';

export const meta = () => [{title: 'Sign in | Hydrogen'}];

export default function SignIn() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-kicker">Account</p>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Sign in to view orders, manage addresses, and check out faster.
        </p>

        <div className="auth-actions">
          <Link to="/account/login" className="btn btn--primary">
            Continue with email
          </Link>
          <Link to="/collections/all" className="btn btn--outline-dark">
            Continue shopping
          </Link>
        </div>

        <p className="auth-fineprint">
          You’ll be redirected to Shopify to complete sign-in.
        </p>
      </div>
    </div>
  );
}

