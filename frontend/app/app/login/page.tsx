'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sunrise.local');
  const [password, setPassword] = useState('ChangeMe!123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.message || 'Invalid email or password');

      localStorage.setItem(
        'crmUser',
        JSON.stringify({
          token: data.token,
          name: data.name,
          role: data.role,
        }),
      );

      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-visual">
        <img src="/sunrise-residency-hero.png" alt="Sunrise Residency" />
        <div className="login-overlay" />
        <div className="login-visual-content">
          <div className="login-brand-large">
            <div className="brand-mark large">
              <span className="sun-arc" />
              <span className="sun-dot" />
            </div>
            <div>
              <strong>Sunrise</strong>
              <span>Builder CRM</span>
            </div>
          </div>

          <div className="login-hero-copy">
            <div className="eyebrow light">SMARTER PROPERTY OPERATIONS</div>
            <h1>Everything your sales team needs to close the right deal.</h1>
            <p>Track projects, inventory, leads and employee performance from one calm, connected workspace.</p>
          </div>

          <div className="login-hero-meta">
            <span>Projects</span>
            <span>Inventory</span>
            <span>Leads</span>
            <span>Performance</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-logo">
            <div className="brand-mark">
              <span className="sun-arc" />
              <span className="sun-dot" />
            </div>
            <div>
              <strong>Sunrise</strong>
              <span>Builder CRM</span>
            </div>
          </div>

          <div className="login-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to your workspace</h2>
            <p>Use your company credentials to continue.</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {error && <div className="form-error">{error}</div>}

            <button className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              <span>→</span>
            </button>
          </form>

          <div className="login-footer">
            <span>Secure internal workspace</span>
            <span>v1.0</span>
          </div>
        </div>
      </section>
    </div>
  );
}
