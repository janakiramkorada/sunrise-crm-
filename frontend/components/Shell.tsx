'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { current } from '@/lib/api';

const nav = [
  { href: '/', label: 'Dashboard', icon: '\u2302' },
  { href: '/projects', label: 'Projects', icon: '\u25A6' },
  { href: '/inventory', label: 'Inventory', icon: '\u25C9' },
  { href: '/employees', label: 'Employees', icon: '\u2659' },
  { href: '/leads', label: 'Leads', icon: '\u2197' },
  { href: '/site-visits', label: 'Site Visits', icon: '\u25F7' },
  { href: '/reports', label: 'Reports', icon: '\u25A4' },
];

export default function Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = current();
    setUser(u);

    if (!u) {
      router.replace('/login');
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('crmUser');
    router.replace('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">

        {/* BRAND */}
        <div className="brand">
          <div className="brand-mark">
            <span className="sun-arc" />
            <span className="sun-dot" />
          </div>

          <div>
            <strong>Sunrise</strong>
            <span>Builder CRM</span>
          </div>
        </div>

        {/* MAIN MENU */}
        <div className="nav-section-title">
          MAIN MENU
        </div>

        <nav className="nav-list">
          {nav.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <span className="nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* SPACER */}
        <div className="sidebar-spacer" />

        {/* SYSTEM STATUS */}
        <div className="system-status">
          <span className="status-dot" />

          <div>
            <strong>Live system</strong>
            <span>All services operational</span>
          </div>
        </div>

        {/* LOGOUT */}
        <button
          className="logout-btn"
          onClick={logout}
        >
          <span>{'\u21E5'}</span>
          <span>Log out</span>
        </button>

      </aside>

      {/* MAIN CONTENT */}
      <div className="content-shell">

        {/* TOP BAR */}
        <header className="topbar">

          <div>
            <div className="eyebrow">
              SUNRISE RESIDENCY
            </div>

            <h1 className="page-context">
              {pathname === '/'
                ? 'Dashboard'
                : pathname.startsWith('/inventory')
                  ? 'Inventory'
                  : pathname.startsWith('/employees')
                    ? 'Employees'
                    : pathname.startsWith('/leads')
                      ? 'Leads'
                      : pathname.startsWith('/site-visits')
                        ? 'Site Visits'
                        : pathname.startsWith('/reports')
                          ? 'Reports'
                          : pathname.startsWith('/projects')
                            ? 'Projects'
                            : 'Workspace'}
            </h1>
          </div>

          {/* TOP RIGHT */}
          <div className="topbar-actions">

            <div className="live-pill">
              <span className="status-dot" />
              Live system
            </div>

            <div className="profile-chip">

              <div className="avatar">
                {(user?.name || 'S')
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="profile-copy">
                <strong>
                  {user?.name || 'System Admin'}
                </strong>

                <span>
                  {user?.role || 'ADMIN'}
                </span>
              </div>

              <span className="chevron">
                {'\u2304'}
              </span>

            </div>

          </div>
        </header>

        {/* PAGE */}
        <main className="page-content">
          {children}
        </main>

      </div>
    </div>
  );
}