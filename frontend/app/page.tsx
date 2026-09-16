'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './dashboard.module.css';

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type ProjectRow = {
  id: string;
  name?: string;
  location?: string;
  status?: string;
  towerCount?: number;
};

type UnitRow = {
  id: string;
  unitNumber?: string;
  name?: string;
  projectName?: string;
  project?: string;
  towerName?: string;
  tower?: string;
  floor?: number | string;
  unitType?: string;
  type?: string;
  propertyType?: string;
  area?: number | string;
  areaSqFt?: number | string;
  currentPrice?: number | string;
  price?: number | string;
  basePrice?: number | string;
  status?: string;
};

type DashboardData = {
  users?: number;
  managers?: number;
  employees?: number;
  projects?: number;
  units?: number;
  inventory?: {
    available?: number;
    blocked?: number;
    booked?: number;
    sold?: number;
  };
};

type SectionKey = 'users' | 'managers' | 'employees' | 'projects' | 'units' | null;

const sectionMeta = {
  users: { label: 'Users', icon: '◉', tone: styles.blue },
  managers: { label: 'Managers', icon: '◆', tone: styles.purple },
  employees: { label: 'Employees', icon: '◎', tone: styles.green },
  projects: { label: 'Projects', icon: '▦', tone: styles.orange },
  units: { label: 'Units', icon: '⌂', tone: styles.cyan },
} as const;

function money(value: number | string | undefined | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount === 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function label(value?: string) {
  if (!value) return '—';
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function statusClass(status?: string) {
  const value = String(status || '').toUpperCase();
  if (value === 'AVAILABLE' || value === 'ACTIVE') return styles.statusGood;
  if (value === 'BLOCKED' || value === 'RESERVED') return styles.statusWarn;
  if (value === 'BOOKED') return styles.statusInfo;
  if (value === 'SOLD') return styles.statusPurple;
  return styles.statusNeutral;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionKey>(null);
  const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      const [dashboardData, usersData, projectsData, inventoryData] = await Promise.all([
        request('/dashboard'),
        request('/users'),
        request('/projects'),
        request('/inventory'),
      ]);
      setDashboard(dashboardData as DashboardData);
      setUsers(Array.isArray(usersData) ? usersData as UserRow[] : []);
      setProjects(Array.isArray(projectsData) ? projectsData as ProjectRow[] : []);
      setUnits(Array.isArray(inventoryData) ? inventoryData as UnitRow[] : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to the CRM backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  const filteredUnits = useMemo(
    () => !inventoryFilter ? units : units.filter(u => String(u.status || '').toUpperCase() === inventoryFilter),
    [units, inventoryFilter]
  );

  const selectedRows = useMemo(() => {
    if (!selectedSection) return [];
    if (selectedSection === 'users') return users;
    if (selectedSection === 'managers') return users.filter(u => String(u.role).toUpperCase() === 'MANAGER');
    if (selectedSection === 'employees') return users.filter(u => String(u.role).toUpperCase() === 'EMPLOYEE');
    if (selectedSection === 'projects') return projects;
    return units;
  }, [selectedSection, users, projects, units]);

  const managerCount = users.filter(u => String(u.role).toUpperCase() === 'MANAGER').length;
  const employeeCount = users.filter(u => String(u.role).toUpperCase() === 'EMPLOYEE').length;

  const kpis = [
    { key: 'users' as const, value: dashboard?.users ?? users.length },
    { key: 'managers' as const, value: dashboard?.managers ?? managerCount },
    { key: 'employees' as const, value: dashboard?.employees ?? employeeCount },
    { key: 'projects' as const, value: dashboard?.projects ?? projects.length },
    { key: 'units' as const, value: dashboard?.units ?? units.length },
  ];

  const inv = dashboard?.inventory || {};
  const inventoryCards = [
    { label: 'Available', value: inv.available ?? 0, status: 'AVAILABLE', cls: styles.available },
    { label: 'Blocked', value: inv.blocked ?? 0, status: 'BLOCKED', cls: styles.blocked },
    { label: 'Booked', value: inv.booked ?? 0, status: 'BOOKED', cls: styles.booked },
    { label: 'Sold', value: inv.sold ?? 0, status: 'SOLD', cls: styles.sold },
  ];

  return (
    <Shell>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>SUNRISE CRM</span>
            <h1>Dashboard</h1>
            <p>Everything important about your property business, in one place.</p>
          </div>
          <button className={styles.refresh} onClick={() => void loadDashboard()}>
            <span>↻</span> Refresh data
          </button>
        </section>

        {error && (
          <div className={styles.error}>
            <span className={styles.errorIcon}>!</span>
            <div>
              <strong>Could not load live CRM data</strong>
              <p>{error}</p>
              <small>Make sure the Spring Boot backend is running, then click Refresh data.</small>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 9 }).map((_, i) => <div className={styles.skeleton} key={i} />)}
          </div>
        ) : (
          <>
            <section className={styles.kpiGrid}>
              {kpis.map(item => {
                const meta = sectionMeta[item.key];
                const active = selectedSection === item.key;
                return (
                  <button
                    key={item.key}
                    className={`${styles.kpi} ${meta.tone} ${active ? styles.active : ''}`}
                    onClick={() => setSelectedSection(active ? null : item.key)}
                  >
                    <span className={styles.kpiTop}>
                      <span className={styles.icon}>{meta.icon}</span>
                      <span className={styles.kpiLabel}>{meta.label}</span>
                    </span>
                    <strong>{item.value}</strong>
                    <span className={styles.action}>{active ? 'Close details' : 'View details →'}</span>
                  </button>
                );
              })}
            </section>

            {selectedSection && (
              <section className={styles.detail}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>DETAIL VIEW</span>
                    <h2>{sectionMeta[selectedSection].label}</h2>
                  </div>
                  <button className={styles.close} onClick={() => setSelectedSection(null)}>Close</button>
                </div>

                {selectedRows.length === 0 ? (
                  <div className={styles.empty}>No records available.</div>
                ) : (
                  <div className={styles.detailList}>
                    {selectedRows.slice(0, 8).map((row: any, i) => {
                      const isUserSection =
                        selectedSection === 'users' ||
                        selectedSection === 'managers' ||
                        selectedSection === 'employees';
                      const isProjectSection = selectedSection === 'projects';
                      const isUnitSection = selectedSection === 'units';

                      return (
                        <div className={styles.detailRow} key={row.id || i}>
                          <div className={styles.detailIdentity}>
                            <span className={`${styles.detailAvatar} ${sectionMeta[selectedSection].tone}`}>
                              {(row.name || row.unitNumber || 'R').charAt(0).toUpperCase()}
                            </span>

                            <div className={styles.detailMain}>
                              <strong>{row.name || row.unitNumber || 'Record'}</strong>

                              {isUserSection && (
                                <div className={styles.detailMeta}>
                                  <span>{row.email || 'No email'}</span>
                                  <span className={styles.detailRole}>{label(row.role)}</span>
                                </div>
                              )}

                              {isProjectSection && (
                                <div className={styles.detailMeta}>
                                  <span>{row.location || 'Location not available'}</span>
                                  <span>{row.towerCount ?? 0} Towers</span>
                                </div>
                              )}

                              {isUnitSection && (
                                <div className={styles.detailMeta}>
                                  <span>{row.projectName || row.project || 'Project unavailable'}</span>
                                  <span>{row.towerName || row.tower || 'Tower unavailable'}</span>
                                  <span>{row.unitType || row.type || row.propertyType || 'Apartment'}</span>
                                  <span>{row.areaSqFt ?? row.area ? `${row.areaSqFt ?? row.area} sq.ft` : 'Area —'}</span>
                                  <span>{money(row.currentPrice ?? row.price ?? row.basePrice)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <span className={statusClass(row.status)}>
                            {label(row.status)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <section className={styles.inventorySection}>
              <div className={styles.sectionHead}>
                <div><span className={styles.eyebrow}>PROPERTY INVENTORY</span><h2>Inventory Overview</h2><p>Track the current availability of every unit.</p></div>
              </div>
              <div className={styles.inventoryGrid}>
                {inventoryCards.map(card => {
                  const active = inventoryFilter === card.status;
                  return (
                    <button key={card.status} className={`${styles.inventoryCard} ${card.cls} ${active ? styles.inventoryActive : ''}`} onClick={() => setInventoryFilter(active ? null : card.status)}>
                      <span>{card.label}</span><strong>{card.value}</strong><small>{active ? 'Showing these units' : 'View units →'}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.tableCard}>
              <div className={styles.tableHead}>
                <div><span className={styles.eyebrow}>UNIT REGISTER</span><h2>{inventoryFilter ? `${label(inventoryFilter)} Units` : 'All Units'}</h2></div>
                {inventoryFilter && <button className={styles.clear} onClick={() => setInventoryFilter(null)}>Clear filter</button>}
              </div>
              {filteredUnits.length === 0 ? (
                <div className={styles.empty}>No units match the selected filter.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table>
                    <thead><tr><th>Unit</th><th>Project</th><th>Tower</th><th>Type</th><th>Area</th><th>Price</th><th>Status</th></tr></thead>
                    <tbody>
                      {filteredUnits.map((unit, i) => {
                        const area = unit.areaSqFt ?? unit.area;
                        const price = unit.currentPrice ?? unit.price ?? unit.basePrice;
                        return (
                          <tr key={unit.id || i}>
                            <td><strong>{unit.unitNumber || unit.name || `Unit ${i + 1}`}</strong></td>
                            <td>{unit.projectName || unit.project || '—'}</td><td>{unit.towerName || unit.tower || '—'}</td>
                            <td>{unit.unitType || unit.type || unit.propertyType || '—'}</td><td>{area ? `${area} sq.ft` : '—'}</td>
                            <td>{money(price)}</td><td><span className={statusClass(unit.status)}>{label(unit.status)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </Shell>
  );
}
