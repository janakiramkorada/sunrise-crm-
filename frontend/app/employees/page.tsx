'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './employees.module.css';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  active: boolean;
};

type Lead = {
  id: string;
  name: string;
  status?: string;
  assignedTo?: { id?: string; name?: string; email?: string };
  assignedToId?: string;
  project?: { name?: string } | string;
  projectName?: string;
};

type SiteVisit = {
  id: string;
  status?: string;
  assignedTo?: { id?: string; name?: string; email?: string };
  assignedToId?: string;
  assignedToName?: string;
  lead?: { id?: string; name?: string };
  leadId?: string;
  leadName?: string;
};

type EmployeeStats = User & {
  leads: number;
  qualified: number;
  siteVisits: number;
  negotiations: number;
  booked: number;
  lost: number;
  conversion: number;
};

const getAssignedId = (item: Lead | SiteVisit) =>
  item.assignedTo?.id || item.assignedToId || '';

const getAssignedName = (item: Lead | SiteVisit) =>
  item.assignedTo?.name || item.assignedTo?.email || '';

const hasCompletedVisit = (lead: Lead, visits: SiteVisit[]) =>
  visits.some((visit) => {
    const visitLeadId = visit.lead?.id || visit.leadId || '';
    const visitLeadName = visit.lead?.name || visit.leadName || '';

    const leadMatches =
      (visitLeadId && visitLeadId === lead.id) ||
      (!visitLeadId &&
        visitLeadName.trim().toLowerCase() === String(lead.name || '').trim().toLowerCase());

    return Boolean(leadMatches) && String(visit.status || '').trim().toUpperCase() === 'COMPLETED';
  });

const money = (value: number) =>
  `₹${new Intl.NumberFormat('en-IN').format(Math.round(value || 0))}`;

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [selected, setSelected] = useState<EmployeeStats | null>(null);
  const [query, setQuery] = useState('');
  const [metricFilter, setMetricFilter] = useState<'all' | 'active' | 'leads' | 'visits' | 'booked'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [allUsers, allLeads, allVisits] = await Promise.all([
        request('/users'),
        request('/leads'),
        request('/site-visits'),
      ]);
      setUsers(allUsers || []);
      setLeads(allLeads || []);
      setVisits(allVisits || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const employeeStats = useMemo<EmployeeStats[]>(() => {
    return users
      .filter((u) => u.role === 'EMPLOYEE')
      .map((employee) => {
        const assignedLeads = leads.filter((lead) => {
          const id = getAssignedId(lead);
          return id ? id === employee.id : getAssignedName(lead) === employee.name;
        });

        const assignedVisits = visits.filter((visit) => {
          const id = getAssignedId(visit);
          return id ? id === employee.id : getAssignedName(visit) === employee.name;
        });

        const qualified = assignedLeads.filter((l) =>
          ['QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'BOOKED'].includes(String(l.status).toUpperCase())
        ).length;

        const negotiations = assignedLeads.filter(
          (l) => String(l.status).toUpperCase() === 'NEGOTIATION'
        ).length;

        const booked = assignedLeads.filter(
          (l) => String(l.status).toUpperCase() === 'BOOKED'
        ).length;

        const lost = assignedLeads.filter(
          (l) => String(l.status).toUpperCase() === 'LOST'
        ).length;

        // A completed site visit is treated as a conversion in the
        // employee/customer lifecycle shown in this CRM.
        const converted = assignedLeads.filter((lead) =>
          hasCompletedVisit(lead, visits)
        ).length;

        return {
          ...employee,
          leads: assignedLeads.length,
          qualified,
          siteVisits: assignedVisits.filter(
            (v) => String(v.status).toUpperCase() !== 'CANCELLED'
          ).length,
          negotiations,
          booked,
          lost,
          conversion: assignedLeads.length ? (converted / assignedLeads.length) * 100 : 0,
        };
      });
  }, [users, leads, visits]);

  const filtered = employeeStats.filter((employee) => {
    const matchesSearch = `${employee.name} ${employee.email}`
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesMetric =
      metricFilter === 'all' ||
      (metricFilter === 'active' && employee.active) ||
      (metricFilter === 'leads' && employee.leads > 0) ||
      (metricFilter === 'visits' && employee.siteVisits > 0) ||
      (metricFilter === 'booked' && employee.booked > 0);

    return matchesSearch && matchesMetric;
  });

  const totals = useMemo(() => ({
    active: employeeStats.filter((e) => e.active).length,
    leads: employeeStats.reduce((sum, e) => sum + e.leads, 0),
    visits: employeeStats.reduce((sum, e) => sum + e.siteVisits, 0),
    booked: employeeStats.reduce((sum, e) => sum + e.booked, 0),
  }), [employeeStats]);

  return (
    <Shell>
      <main className={styles.page}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>TEAM MANAGEMENT</p>
            <h1>Employees</h1>
            <p>Manage your sales team and see who is actually driving the pipeline.</p>
          </div>
          <button className={styles.refresh} onClick={load} disabled={loading}>
            ↻ {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        <section className={styles.summaryGrid}>
          <button
            type="button"
            className={`${styles.summaryCard} ${styles.violet} ${metricFilter === 'active' ? styles.selectedMetric : ''}`}
            onClick={() => setMetricFilter(metricFilter === 'active' ? 'all' : 'active')}
            title="Show active employees"
          >
            <span className={styles.summaryIcon}>👥</span>
            <div><small>Active team</small><strong>{totals.active}</strong></div>
          </button>

          <button
            type="button"
            className={`${styles.summaryCard} ${styles.blue} ${metricFilter === 'leads' ? styles.selectedMetric : ''}`}
            onClick={() => setMetricFilter(metricFilter === 'leads' ? 'all' : 'leads')}
            title="Show employees with assigned leads"
          >
            <span className={styles.summaryIcon}>◉</span>
            <div><small>Leads assigned</small><strong>{totals.leads}</strong></div>
          </button>

          <button
            type="button"
            className={`${styles.summaryCard} ${styles.cyan} ${metricFilter === 'visits' ? styles.selectedMetric : ''}`}
            onClick={() => setMetricFilter(metricFilter === 'visits' ? 'all' : 'visits')}
            title="Show employees with site visits"
          >
            <span className={styles.summaryIcon}>⌖</span>
            <div><small>Site visits</small><strong>{totals.visits}</strong></div>
          </button>

          <button
            type="button"
            className={`${styles.summaryCard} ${styles.green} ${metricFilter === 'booked' ? styles.selectedMetric : ''}`}
            onClick={() => setMetricFilter(metricFilter === 'booked' ? 'all' : 'booked')}
            title="Show employees with booked leads"
          >
            <span className={styles.summaryIcon}>✓</span>
            <div><small>Booked leads</small><strong>{totals.booked}</strong></div>
          </button>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.kicker}>SALES PERFORMANCE</span>
              <h2>Team performance</h2>
              <p>Live metrics calculated from assigned leads and site visits.</p>
            </div>
            <input
              className={styles.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee..."
            />
          </div>

          {metricFilter !== 'all' && (
            <div className={styles.filterBar}>
              <span>
                Showing: <strong>{metricFilter === 'active' ? 'Active employees' : metricFilter === 'leads' ? 'Employees with assigned leads' : metricFilter === 'visits' ? 'Employees with site visits' : 'Employees with booked leads'}</strong>
              </span>
              <button type="button" onClick={() => setMetricFilter('all')}>Clear filter</button>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.loading}>Loading team performance…</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>LEADS</th>
                    <th>SITE VISITS</th>
                    <th>QUALIFIED</th>
                    <th>NEGOTIATION</th>
                    <th>BOOKED</th>
                    <th>CONVERSION</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((employee) => (
                    <tr key={employee.id} onClick={() => setSelected(employee)}>
                      <td>
                        <div className={styles.person}>
                          <span className={styles.avatar}>{employee.name.charAt(0).toUpperCase()}</span>
                          <span>
                            <strong>{employee.name}</strong>
                            <small>{employee.email}</small>
                          </span>
                        </div>
                      </td>
                      <td><strong>{employee.leads}</strong></td>
                      <td>{employee.siteVisits}</td>
                      <td>{employee.qualified}</td>
                      <td>{employee.negotiations}</td>
                      <td><span className={styles.bookedBadge}>{employee.booked}</span></td>
                      <td>
                        <div className={styles.progressCell}>
                          <div className={styles.progress}><span style={{ width: `${Math.min(employee.conversion, 100)}%` }} /></div>
                          <b>{employee.conversion.toFixed(1)}%</b>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.status} ${employee.active ? styles.active : styles.inactive}`}>
                          {employee.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className={styles.empty}>
                  {metricFilter !== 'all'
                    ? 'No employees match this filter.'
                    : 'No employees match your search.'}
                </div>
              )}
            </div>
          )}
        </section>

        <p className={styles.note}>
          Bookings and revenue will connect here automatically when the Booking and Payment modules are added.
        </p>

        {selected && (
          <div className={styles.overlay} onMouseDown={() => setSelected(null)}>
            <section className={styles.drawer} onMouseDown={(e) => e.stopPropagation()}>
              <button className={styles.close} onClick={() => setSelected(null)}>×</button>
              <div className={styles.profile}>
                <span className={styles.profileAvatar}>{selected.name.charAt(0).toUpperCase()}</span>
                <div>
                  <span className={styles.kicker}>SALES EMPLOYEE</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.email}</p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div><small>Assigned leads</small><strong>{selected.leads}</strong></div>
                <div><small>Site visits</small><strong>{selected.siteVisits}</strong></div>
                <div><small>Qualified</small><strong>{selected.qualified}</strong></div>
                <div><small>Negotiations</small><strong>{selected.negotiations}</strong></div>
                <div><small>Booked leads</small><strong>{selected.booked}</strong></div>
                <div><small>Lost leads</small><strong>{selected.lost}</strong></div>
              </div>

              <div className={styles.conversionCard}>
                <div>
                  <small>Current conversion</small>
                  <strong>{selected.conversion.toFixed(1)}%</strong>
                </div>
                <div className={styles.bigProgress}><span style={{ width: `${Math.min(selected.conversion, 100)}%` }} /></div>
              </div>

              <h3>Assigned customers</h3>
              <div className={styles.customerList}>
                {leads.filter((lead) => {
                  const id = getAssignedId(lead);
                  return id ? id === selected.id : getAssignedName(lead) === selected.name;
                }).map((lead) => (
                  <div className={styles.customer} key={lead.id}>
                    <div>
                      <strong>{lead.name}</strong>
                      <small>{typeof lead.project === 'string' ? lead.project : lead.project?.name || lead.projectName || 'Project not set'}</small>
                    </div>
                    <span className={styles.leadStatus}>
                      {hasCompletedVisit(lead, visits)
                        ? 'CONVERSION'
                        : String(lead.status || 'NEW').replace('_', ' ')}
                    </span>
                  </div>
                ))}
                {leads.filter((lead) => {
                  const id = getAssignedId(lead);
                  return id ? id === selected.id : getAssignedName(lead) === selected.name;
                }).length === 0 && <div className={styles.emptySmall}>No leads assigned.</div>}
              </div>
            </section>
          </div>
        )}
      </main>
    </Shell>
  );
}
