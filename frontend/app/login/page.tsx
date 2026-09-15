'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/api';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sunrise.local');
  const [password, setPassword] = useState('ChangeMe!123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem(
        'crmUser',
        JSON.stringify({
          token: data.token,
          name: data.name,
          role: data.role,
        })
      );

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroShade} />

        <div className={styles.brand}>
          <div className={styles.logoMini}>
            <img src="/sunrise-crm-logo.svg" alt="Sunrise Builder CRM" />
          </div>
          <div>
            <strong>Sunrise</strong>
            <span>Builder CRM</span>
          </div>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>SMARTER PROPERTY OPERATIONS</p>
          <h1>
            Everything your
            <br />
            sales team needs
            <br />
            to close the <em>right deal.</em>
          </h1>
          <p className={styles.heroText}>
            Track projects, inventory, leads and employee performance
            from one calm, connected workspace.
          </p>
        </div>

        <div className={styles.features}>
          <span>PROJECTS</span>
          <i />
          <span>INVENTORY</span>
          <i />
          <span>LEADS</span>
          <i />
          <span>PERFORMANCE</span>
        </div>
      </section>

      <section className={styles.loginSide}>
        <div className={styles.loginCard}>
          <img
            className={styles.loginLogo}
            src="/sunrise-crm-logo.svg"
            alt="Sunrise Builder CRM"
          />

          <div className={styles.welcome}>
            <p className={styles.eyebrowDark}>WELCOME BACK</p>
            <h2>Sign in to your workspace</h2>
            <p>Use your company credentials to continue.</p>
          </div>

          <form onSubmit={submit}>
            <label>
              Email address
              <div className={styles.inputWrap}>
                <span>✉</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </label>

            <label>
              Password
              <div className={styles.inputWrap}>
                <span>♙</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.show}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button className={styles.signIn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              <span>→</span>
            </button>
          </form>

          <div className={styles.footer}>
            <span>🔒 Secure internal workspace</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </section>
    </main>
  );
}
