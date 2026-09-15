'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './dashboard.module.css';

type DashboardData = {
  users: number;
  managers: number;
  employees: number;
  projects: number;
  units: number;
  inventory: Record<string, number>;
};

type DetailKey = 'users' | 'managers' | 'employees' | 'projects' | 'units' | null;
type InventoryStatus = 'available' | 'blocked' | 'booked' | 'sold' | null;
type Row = Record<string, any>;

const metricMeta = {
  users: { label: 'Users', icon: '◉', tone: 'purple', description: 'All CRM users' },
  managers: { label: 'Managers', icon: '♟', tone: 'amber', description: 'Management team' },
  employees: { label: 'Employees', icon: '◎', tone: 'blue', description: 'Active sales team' },
  projects: { label: 'Projects', icon: '⌂', tone: 'teal', description: 'Live developments' },
  units: { label: 'Units', icon: '▦', tone: 'rose', description: 'Total inventory' },
} as const;

function prettyStatus(value: string) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function money(value: any) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : `₹${n.toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [detail, setDetail] = useState<DetailKey>(null);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>(null);
  const [detailRows, setDetailRows] = useState<Row[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/dashboard')
      .then(setData)
      .catch((err: Error) => setError(err.message || 'Failed to load dashboard'));
  }, []);

  useEffect(() => {
    if (!detail) {
      setDetailRows([]);
      return;
    }

    const endpoint =
      detail === 'users' || detail === 'managers' ? '/users' :
      detail === 'employees' ? '/employees' :
      detail === 'projects' ? '/projects' :
      detail === 'units' ? '/inventory' : '';

    if (!endpoint) return;

    setDetailLoading(true);
    request(endpoint)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : rows?.content || [];
        if (detail === 'managers') {
          setDetailRows(list.filter((r: Row) => String(r.role || '').toUpperCase() === 'MANAGER'));
        } else {
          setDetailRows(list);
        }
      })
      .catch((err: Error) => {
        setDetailRows([{ error: err.message || 'Could not load details' }]);
      })
      .finally(() => setDetailLoading(false));
  }, [detail]);

  const detailTitle = detail ? metricMeta[detail].label : '';

  const inventoryCards = useMemo(() => {
    const names: InventoryStatus[] = ['available', 'blocked', 'booked', 'sold'];
    return names.map((name) => ({
      key: name!,
      label: prettyStatus(name!),
      count: Number(data?.inventory?.[name!] || 0),
      tone: name!,
    }));
  }, [data]);

  const visibleUnits = useMemo(() => {
    if (!inventoryStatus) return detailRows;
    return detailRows.filter(
      row => String(row.status || '').toLowerCase() === inventoryStatus.toLowerCase()
    );
  }, [detailRows, inventoryStatus]);

  function openInventory(status: InventoryStatus = null) {
    setInventoryStatus(status);
    setDetail('units');
  }

  if (error) {
    return (
      <Shell>
        <section className={styles.stateCard}>
          <div className={styles.stateIcon}>!</div>
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>
        </section>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <section className={styles.loading}>
          <div className={styles.loadingBar} />
          <div className={styles.loadingBarShort} />
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>SUNRISE RESIDENCY · ADMIN WORKSPACE</div>
          <h2 className={styles.title}>Dashboard</h2>
          <p className={styles.subtitle}>Monitor people, projects and inventory from one place.</p>
        </div>
        <div className={styles.liveBadge}>
          <span />
          Live data
        </div>
      </div>

      <section className={styles.metricGrid}>
        {(Object.keys(metricMeta) as Array<keyof typeof metricMeta>).map((key) => {
          const meta = metricMeta[key];
          const value = data[key];

          return (
            <button
              type="button"
              key={key}
              className={`${styles.metricCard} ${styles[meta.tone]}`}
              onClick={() => {
                if (detail === key) {
                  setDetail(null);
                  setInventoryStatus(null);
                } else {
                  setInventoryStatus(null);
                  setDetail(key);
                }
              }}
            >
              <div className={styles.metricTop}>
                <span className={styles.metricIcon}>{meta.icon}</span>
                <span className={styles.metricAction}>{detail === key ? 'Close' : 'View details'} →</span>
              </div>
              <div className={styles.metricValue}>{value}</div>
              <div className={styles.metricLabel}>{meta.label}</div>
              <div className={styles.metricDescription}>{meta.description}</div>
            </button>
          );
        })}
      </section>

      {detail && (
        <section className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.kicker}>
                {detail === 'units' ? 'PROPERTY INVENTORY' : 'LIVE DATA'}
              </div>
              <h3>
                {detail === 'units' && inventoryStatus
                  ? `${prettyStatus(inventoryStatus)} units`
                  : `${detailTitle} details`}
              </h3>
              <p>
                {detail === 'units' && inventoryStatus
                  ? `${visibleUnits.length} ${inventoryStatus} unit${visibleUnits.length === 1 ? '' : 's'} found.`
                  : 'Information from the current CRM records.'}
              </p>
            </div>

            <div className={styles.detailActions}>
              {detail === 'units' && inventoryStatus && (
                <button className={styles.closeButton} onClick={() => setInventoryStatus(null)}>
                  Show all units
                </button>
              )}
              <button
                className={styles.closeButton}
                onClick={() => {
                  setDetail(null);
                  setInventoryStatus(null);
                }}
              >
                Close
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className={styles.detailLoading}>Loading details…</div>
          ) : detailRows.some(r => r.error) ? (
            <div className={styles.emptyRow}>{detailRows[0]?.error}</div>
          ) : detail === 'users' || detail === 'managers' ? (
            <div className={styles.peopleGrid}>
              {detailRows.map((r, i) => (
                <div className={styles.personCard} key={r.id || i}>
                  <div className={`${styles.avatar} ${styles.purple}`}>
                    {String(r.name || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.personInfo}>
                    <strong>{r.name || 'Unnamed user'}</strong>
                    <span>{r.email || '—'}</span>
                    <div className={styles.badgeRow}>
                      <span className={styles.roleBadge}>{r.role || '—'}</span>
                      <span className={r.active === false ? styles.offBadge : styles.onBadge}>
                        {r.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : detail === 'employees' ? (
            <div className={styles.peopleGrid}>
              {detailRows.map((r, i) => (
                <div className={styles.personCard} key={r.id || i}>
                  <div className={`${styles.avatar} ${styles.blue}`}>
                    {String(r.name || 'E').slice(0, 1).toUpperCase()}
                  </div>
                  <div className={styles.personInfo}>
                    <strong>{r.name || 'Unnamed employee'}</strong>
                    <span>{r.email || '—'}</span>
                    <div className={styles.badgeRow}>
                      <span className={styles.roleBadge}>{r.role || 'EMPLOYEE'}</span>
                      <span className={r.active === false ? styles.offBadge : styles.onBadge}>
                        {r.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : detail === 'projects' ? (
            <div className={styles.peopleGrid}>
              {detailRows.map((r, i) => (
                <div className={styles.projectCard} key={r.id || i}>
                  <div className={styles.projectAccent} />
                  <div>
                    <div className={styles.projectName}>{r.name || 'Unnamed project'}</div>
                    <div className={styles.projectMeta}>{r.city || r.location || '—'}</div>
                    <div className={styles.badgeRow}>
                      <span className={styles.roleBadge}>{prettyStatus(r.status || 'Active')}</span>
                      <span className={styles.roleBadge}>{prettyStatus(r.projectType || 'Project')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.detailTable}>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Project</th>
                    <th>Tower</th>
                    <th>Type</th>
                    <th>Area</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUnits.map((r, i) => (
                    <tr key={r.id || i}>
                      <td><strong>{r.unitNumber || r.number || '—'}</strong></td>
                      <td>{r.projectName || r.project || 'Sunrise Residency'}</td>
                      <td>{r.towerName || r.tower || 'Tower A'}</td>
                      <td>{r.propertyType || r.type || '—'}</td>
                      <td>{r.areaSqFt ?? r.area ?? '—'} sq.ft</td>
                      <td>{money(r.price)}</td>
                      <td>
                        <span className={`${styles.statusPill} ${styles[`status_${String(r.status || '').toLowerCase()}`]}`}>
                          {prettyStatus(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className={styles.inventorySection}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.kicker}>PROPERTY INVENTORY</div>
            <h3>Inventory summary</h3>
            <p>{data.units} total units across Sunrise Residency.</p>
          </div>

          <button className={styles.secondaryButton} onClick={() => openInventory(null)}>
            Open all units →
          </button>
        </div>

        <div className={styles.inventoryGrid}>
          {inventoryCards.map((card) => (
            <button
              type="button"
              key={card.key}
              className={`${styles.inventoryCard} ${styles[`inv_${card.tone}`]} ${inventoryStatus === card.key ? styles.inventorySelected : ''}`}
              onClick={() => openInventory(card.key)}
            >
              <div className={styles.inventoryLabel}>{card.label}</div>
              <strong>{card.count}</strong>
              <span>{card.count === 1 ? 'Unit' : 'Units'}</span>
              <small>View {card.label.toLowerCase()} →</small>
            </button>
          ))}
        </div>
      </section>
    </Shell>
  );
}
