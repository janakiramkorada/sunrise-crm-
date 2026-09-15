'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { current } from '@/lib/api';

const nav = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/projects', label: 'Projects', icon: '▦' },
  { href: '/inventory', label: 'Inventory', icon: '◫' },
  { href: '/employees', label: 'Employees', icon: '♙' },
  { href: '/leads', label: 'Leads', icon: '↗' },
  { href: '/reports', label: 'Reports', icon: '▤' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = current();
    setUser(u);
    if (!u) router.replace('/login');
  }, [router]);

  const logout = () => {
    localStorage.removeItem('crmUser');
    router.replace('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
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

        <div className="nav-section-title">MAIN MENU</div>
        <nav className="nav-list">
          {nav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="system-status">
          <span className="status-dot" />
          <div>
            <strong>Live system</strong>
            <span>All services operational</span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          <span>⇥</span>
          <span>Log out</span>
        </button>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">SUNRISE RESIDENCY</div>
            <h1 className="page-context">
              {pathname === '/' ? 'Dashboard' :
               pathname.startsWith('/inventory') ? 'Inventory' :
               pathname.startsWith('/employees') ? 'Employees' :
               pathname.startsWith('/leads') ? 'Leads' :
               pathname.startsWith('/reports') ? 'Reports' :
               pathname.startsWith('/projects') ? 'Projects' : 'Workspace'}
            </h1>
          </div>

          <div className="topbar-actions">
            <div className="live-pill">
              <span className="status-dot" />
              Live system
            </div>
            <div className="profile-chip">
              <div className="avatar">{(user?.name || 'S').slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <strong>{user?.name || 'System Admin'}</strong>
                <span>{user?.role || 'ADMIN'}</span>
              </div>
              <span className="chevron">⌄</span>
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
