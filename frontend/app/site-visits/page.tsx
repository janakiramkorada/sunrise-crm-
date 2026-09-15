'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './site-visits.module.css';

type Lead = {
  id: string;
  name: string;
  phone?: string;
  projectId?: string;
  project?: string;
  assignedToId?: string;
};

type Project = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  role: string;
  active?: boolean;
};

type Tower = {
  id: string;
  name: string;
};

type Unit = {
  id: string;
  unitNumber?: string;
  number?: string;
  towerId?: string;
  currentPrice?: number;
};

type SiteVisit = {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  projectId: string;
  projectName: string;
  towerId?: string;
  towerName?: string;
  unitId?: string;
  unitNumber?: string;
  assignedToId?: string;
  assignedTo?: string;
  assignedToName?: string;
  visitDate: string;
  visitTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  notes?: string;
};

const statuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'];

export default function SiteVisits() {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    leadId: '',
    projectId: '',
    towerId: '',
    unitId: '',
    assignedToId: '',
    visitDate: '',
    visitTime: '',
    status: 'SCHEDULED',
    notes: '',
  });

  async function loadVisits() {
    try {
      setMessage('');
      const data = await request('/site-visits');
      setVisits(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load site visits');
    }
  }

  async function loadReferenceData() {
    try {
      const [leadData, projectData, userData] = await Promise.all([
        request('/leads'),
        request('/projects'),
        request('/users'),
      ]);
      setLeads(leadData);
      setProjects(projectData);
      setUsers(userData.filter((u: User) => u.active !== false));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load form data');
    }
  }

  useEffect(() => {
    void loadVisits();
    void loadReferenceData();
  }, []);

  async function loadPropertyOptions(projectId: string, towerId = '') {
    try {
      if (!projectId) {
        setTowers([]);
        setUnits([]);
        return;
      }

      const towerData = await request(`/projects/${projectId}/towers`);
      setTowers(towerData);

      if (towerId) {
        const unitData = await request(
          `/inventory?projectId=${projectId}&towerId=${towerId}`,
        );
        setUnits(unitData);
      } else {
        setUnits([]);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load property options');
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      leadId: '',
      projectId: '',
      towerId: '',
      unitId: '',
      assignedToId: '',
      visitDate: '',
      visitTime: '',
      status: 'SCHEDULED',
      notes: '',
    });
    setTowers([]);
    setUnits([]);
    setMessage('');
    setShowModal(true);
  }

  function openEdit(visit: SiteVisit) {
    setEditingId(visit.id);
    setForm({
      leadId: visit.leadId,
      projectId: visit.projectId,
      towerId: visit.towerId || '',
      unitId: visit.unitId || '',
      assignedToId: visit.assignedToId || '',
      visitDate: visit.visitDate,
      visitTime: visit.visitTime,
      status: visit.status,
      notes: visit.notes || '',
    });
    setMessage('');
    setShowModal(true);
    void loadPropertyOptions(visit.projectId, visit.towerId || '');
  }

  function handleLeadChange(leadId: string) {
    const lead = leads.find((item) => item.id === leadId);
    const projectId = lead?.projectId || '';
    const assignedToId = lead?.assignedToId || '';

    setForm((current) => ({
      ...current,
      leadId,
      projectId,
      assignedToId,
      towerId: '',
      unitId: '',
    }));

    void loadPropertyOptions(projectId);
  }

  async function handleProjectChange(projectId: string) {
    setForm((current) => ({
      ...current,
      projectId,
      towerId: '',
      unitId: '',
    }));
    await loadPropertyOptions(projectId);
  }

  async function handleTowerChange(towerId: string) {
    setForm((current) => ({ ...current, towerId, unitId: '' }));
    if (form.projectId && towerId) {
      try {
        const data = await request(
          `/inventory?projectId=${form.projectId}&towerId=${towerId}`,
        );
        setUnits(data);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Unable to load units');
      }
    } else {
      setUnits([]);
    }
  }

  async function saveVisit(event: React.FormEvent) {
    event.preventDefault();

    if (
      !form.leadId ||
      !form.projectId ||
      !form.assignedToId ||
      !form.visitDate ||
      !form.visitTime
    ) {
      setMessage('Please fill Lead, Project, Employee, Date and Time.');
      return;
    }

    try {
      setMessage('');

      if (editingId) {
        await request(`/site-visits/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await request('/site-visits', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }

      setShowModal(false);
      setEditingId(null);
      await loadVisits();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to save site visit');
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await request(`/site-visits/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadVisits();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to update status');
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visits.filter((visit) => {
      const matchesStatus =
        statusFilter === 'ALL' || visit.status === statusFilter;

      const text = [
        visit.leadName,
        visit.leadPhone,
        visit.projectName,
        visit.towerName,
        visit.unitNumber,
        visit.assignedToName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!query || text.includes(query));
    });
  }, [visits, search, statusFilter]);

  const stats = {
    total: visits.length,
    scheduled: visits.filter((v) => v.status === 'SCHEDULED').length,
    completed: visits.filter((v) => v.status === 'COMPLETED').length,
    cancelled: visits.filter((v) => v.status === 'CANCELLED').length,
  };

  return (
    <Shell>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>SALES ACTIVITY</div>
            <h1>Site Visits</h1>
            <p>Schedule, manage and track customer property visits.</p>
          </div>
          <button className={styles.primaryButton} onClick={openCreate}>
            + Schedule Site Visit
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span>Total Visits</span>
            <strong>{stats.total}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Scheduled</span>
            <strong>{stats.scheduled}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Completed</span>
            <strong>{stats.completed}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Cancelled</span>
            <strong>{stats.cancelled}</strong>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, project or employee..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button
            className={styles.secondaryButton}
            onClick={() => void loadVisits()}
          >
            Refresh
          </button>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h2>Visit Schedule</h2>
              <span>{filtered.length} visits shown</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Project / Property</th>
                  <th>Date & Time</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Change Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      No site visits found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <div className={styles.customer}>
                          <strong>{visit.leadName}</strong>
                          <span>{visit.leadPhone || 'No phone'}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.property}>
                          <strong>{visit.projectName}</strong>
                          <span>
                            {[visit.towerName, visit.unitNumber]
                              .filter(Boolean)
                              .join(' • ') || 'Property not selected'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.dateTime}>
                          <strong>{visit.visitDate}</strong>
                          <span>{visit.visitTime}</span>
                        </div>
                      </td>
                      <td>{visit.assignedToName || '—'}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles[visit.status.toLowerCase()]}`}
                        >
                          {visit.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <select
                          className={styles.statusSelect}
                          value={visit.status}
                          onChange={(e) =>
                            void updateStatus(visit.id, e.target.value)
                          }
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className={styles.editButton}
                          onClick={() => openEdit(visit)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div
            className={styles.overlay}
            onMouseDown={() => setShowModal(false)}
          >
            <div
              className={styles.modal}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <div className={styles.eyebrow}>SITE VISIT</div>
                  <h2>
                    {editingId ? 'Edit Site Visit' : 'Schedule Site Visit'}
                  </h2>
                </div>
                <button
                  className={styles.close}
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveVisit}>
                <div className={styles.formGrid}>
                  <label>
                    Customer / Lead *
                    <select
                      value={form.leadId}
                      onChange={(e) => handleLeadChange(e.target.value)}
                    >
                      <option value="">Select customer</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name}
                          {lead.phone ? ` — ${lead.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Project *
                    <select
                      value={form.projectId}
                      onChange={(e) =>
                        void handleProjectChange(e.target.value)
                      }
                    >
                      <option value="">Select project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Assigned Employee *
                    <select value={form.assignedToId} disabled>
                      <option value="">
                        {form.leadId
                          ? 'No employee assigned to this lead'
                          : 'Select customer first'}
                      </option>
                      {users
                        .filter((user) => user.id === form.assignedToId)
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                    <small className={styles.fieldHint}>
                      Automatically assigned from the selected lead.
                    </small>
                  </label>

                  <label>
                    Visit Status
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          status: e.target.value,
                        }))
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Tower
                    <select
                      value={form.towerId}
                      onChange={(e) =>
                        void handleTowerChange(e.target.value)
                      }
                      disabled={!form.projectId}
                    >
                      <option value="">Select tower</option>
                      {towers.map((tower) => (
                        <option key={tower.id} value={tower.id}>
                          {tower.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Unit
                    <select
                      value={form.unitId}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          unitId: e.target.value,
                        }))
                      }
                      disabled={!form.towerId}
                    >
                      <option value="">Select unit</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unitNumber || unit.number}
                          {unit.currentPrice != null
                            ? ` — ₹${Number(unit.currentPrice).toLocaleString(
                                'en-IN',
                              )}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Visit Date *
                    <input
                      type="date"
                      value={form.visitDate}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          visitDate: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Visit Time *
                    <input
                      type="time"
                      value={form.visitTime}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          visitTime: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className={styles.full}>
                    Notes
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Add visit notes..."
                    />
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.primaryButton}>
                    {editingId ? 'Save Changes' : 'Schedule Visit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}