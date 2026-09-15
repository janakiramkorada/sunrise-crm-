'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './leads.module.css';

type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  notes?: string;
  status: string;
  project?: string;
  projectName?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToId?: string;
};

const statuses = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
  'BOOKED',
  'LOST',
];

function formatStatus(status: string) {
  return status.replace('_', ' ');
}

function getStatusClass(status: string) {
  switch (status) {
    case 'NEW':
      return styles.statusNew;
    case 'CONTACTED':
      return styles.statusContacted;
    case 'QUALIFIED':
      return styles.statusQualified;
    case 'SITE_VISIT':
      return styles.statusSiteVisit;
    case 'NEGOTIATION':
      return styles.statusNegotiation;
    case 'BOOKED':
      return styles.statusBooked;
    case 'LOST':
      return styles.statusLost;
    default:
      return styles.statusDefault;
  }
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setMessage('');

      const data = await request('/leads');
      setLeads(data);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Unable to load leads'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      setMessage('');

      await request(`/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      await load();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Unable to update status'
      );
    }
  }

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const employee =
        lead.assignedToName ||
        lead.assignedTo ||
        '';

      const project =
        lead.projectName ||
        lead.project ||
        '';

      const searchText = `
        ${lead.name}
        ${lead.phone}
        ${lead.email || ''}
        ${lead.source}
        ${project}
        ${employee}
      `.toLowerCase();

      const matchesSearch =
        searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const statusCounts = statuses.reduce(
    (acc, status) => {
      acc[status] = leads.filter(
        (lead) => lead.status === status
      ).length;

      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Shell>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>
              SALES PIPELINE
            </div>

            <h1 className={styles.title}>Leads</h1>

            <p className={styles.subtitle}>
              Manage enquiries, follow-ups and customer
              opportunities from one place.
            </p>
          </div>

          <button
            className={styles.refreshButton}
            onClick={() => void load()}
            disabled={loading}
          >
            <span className={styles.refreshIcon}>↻</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Summary cards */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>TOTAL LEADS</div>
            <div className={styles.statValue}>
              {leads.length}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>QUALIFIED</div>
            <div className={styles.statValue}>
              {statusCounts.QUALIFIED || 0}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>SITE VISITS</div>
            <div className={styles.statValue}>
              {statusCounts.SITE_VISIT || 0}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>BOOKED</div>
            <div className={styles.statValue}>
              {statusCounts.BOOKED || 0}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>
                Lead register
              </h2>

              <p className={styles.panelSubtitle}>
                {filtered.length} of {leads.length} leads
                shown
              </p>
            </div>

            <div className={styles.filters}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search leads..."
                />
              </div>

              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All statuses
                </option>

                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {message && (
            <div className={styles.message}>
              {message}
            </div>
          )}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>LEAD</th>
                  <th>CONTACT</th>
                  <th>SOURCE</th>
                  <th>PROJECT</th>
                  <th>ASSIGNED TO</th>
                  <th>STATUS</th>
                  <th>CHANGE STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((lead) => {
                  const employee =
                    lead.assignedToName ||
                    lead.assignedTo ||
                    'Unassigned';

                  const project =
                    lead.projectName ||
                    lead.project ||
                    '—';

                  return (
                    <tr key={lead.id}>
                      <td>
                        <div className={styles.leadCell}>
                          <div className={styles.avatar}>
                            {lead.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <div className={styles.leadName}>
                              {lead.name}
                            </div>

                            {lead.email && (
                              <div className={styles.email}>
                                {lead.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.phone}>
                          {lead.phone}
                        </div>
                      </td>

                      <td>
                        <span className={styles.source}>
                          {formatStatus(lead.source)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.project}>
                          {project}
                        </span>
                      </td>

                      <td>
                        <div className={styles.employee}>
                          <div className={styles.employeeAvatar}>
                            {employee !== 'Unassigned'
                              ? employee
                                  .charAt(0)
                                  .toUpperCase()
                              : '?'}
                          </div>

                          <span>{employee}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.status} ${getStatusClass(
                            lead.status
                          )}`}
                        >
                          {formatStatus(lead.status)}
                        </span>
                      </td>

                      <td>
                        <select
                          className={styles.statusSelect}
                          value={lead.status}
                          onChange={(e) =>
                            void updateStatus(
                              lead.id,
                              e.target.value
                            )
                          }
                        >
                          {statuses.map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className={styles.emptyCell}
                    >
                      <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                          ◌
                        </div>

                        <strong>
                          No leads found
                        </strong>

                        <span>
                          Try changing your search or
                          status filter.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Shell>
  );
}