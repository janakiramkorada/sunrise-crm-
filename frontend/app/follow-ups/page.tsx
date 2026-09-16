'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './followups.module.css';

type Lead = {
  id: string;
  name: string;
  phone?: string;
  projectId?: string;
  project?: string;
  assignedToId?: string;
  assignedTo?: string;
};

type Employee = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  active?: boolean;
};

type Project = {
  id: string;
  name: string;
};

type FollowUp = {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  projectId: string;
  projectName: string;
  assignedToId?: string;
  assignedToName?: string;
  followUpDate: string;
  followUpTime: string;
  type: 'CALL' | 'WHATSAPP' | 'MEETING' | 'EMAIL';
  notes?: string;
  nextFollowUpDate?: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
};

type FormState = {
  leadId: string;
  projectId: string;
  assignedToId: string;
  followUpDate: string;
  followUpTime: string;
  type: FollowUp['type'];
  notes: string;
  nextFollowUpDate: string;
  status: FollowUp['status'];
};

const emptyForm: FormState = {
  leadId: '',
  projectId: '',
  assignedToId: '',
  followUpDate: '',
  followUpTime: '',
  type: 'CALL',
  notes: '',
  nextFollowUpDate: '',
  status: 'PLANNED',
};

function label(value?: string) {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value?: string) {
  if (!value) return '—';
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [followUpData, leadData, employeeData, projectData] = await Promise.all([
        request('/follow-ups'),
        request('/leads'),
        request('/users'),
        request('/projects'),
      ]);

      setFollowUps(Array.isArray(followUpData) ? followUpData : []);
      setLeads(Array.isArray(leadData) ? leadData : []);
      setEmployees(
        (Array.isArray(employeeData) ? employeeData : []).filter(
          (user) => String(user.role || '').toUpperCase() === 'EMPLOYEE'
        )
      );
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleFollowUps = useMemo(() => {
    const query = search.trim().toLowerCase();

    return followUps.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.leadName,
          item.leadPhone,
          item.projectName,
          item.assignedToName,
          item.notes,
          item.type,
          item.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      const matchesType =
        typeFilter === 'ALL' || item.type === typeFilter;

      const matchesEmployee =
        employeeFilter === 'ALL' || item.assignedToId === employeeFilter;

      return matchesSearch && matchesStatus && matchesType && matchesEmployee;
    });
  }, [followUps, search, statusFilter, typeFilter, employeeFilter]);

  const metrics = useMemo(
    () => ({
      total: followUps.length,
      planned: followUps.filter((x) => x.status === 'PLANNED').length,
      completed: followUps.filter((x) => x.status === 'COMPLETED').length,
      cancelled: followUps.filter((x) => x.status === 'CANCELLED').length,
    }),
    [followUps]
  );

  function openCreate() {
    const today = new Date().toISOString().slice(0, 10);
    setEditing(null);
    setForm({
      ...emptyForm,
      followUpDate: today,
    });
    setShowForm(true);
    setError('');
  }

  function openEdit(item: FollowUp) {
    setEditing(item);
    setForm({
      leadId: item.leadId,
      projectId: item.projectId,
      assignedToId: item.assignedToId || '',
      followUpDate: item.followUpDate,
      followUpTime: item.followUpTime?.slice(0, 5) || '',
      type: item.type,
      notes: item.notes || '',
      nextFollowUpDate: item.nextFollowUpDate || '',
      status: item.status,
    });
    setShowForm(true);
    setError('');
  }

  function handleLeadChange(leadId: string) {
    const lead = leads.find((item) => item.id === leadId);
    setForm((current) => ({
      ...current,
      leadId,
      projectId: lead?.projectId || '',
      assignedToId: lead?.assignedToId || '',
    }));
  }

  async function saveFollowUp(event: FormEvent) {
    event.preventDefault();

    if (!form.leadId || !form.projectId || !form.assignedToId) {
      setError('Please select a lead, project, and employee.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        leadId: form.leadId,
        projectId: form.projectId,
        assignedToId: form.assignedToId,
        followUpDate: form.followUpDate,
        followUpTime: form.followUpTime,
        type: form.type,
        notes: form.notes,
        nextFollowUpDate: form.nextFollowUpDate || null,
        status: form.status,
      };

      if (editing) {
        await request(`/follow-ups/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/follow-ups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: FollowUp, status: FollowUp['status']) {
    try {
      setError('');
      await request(
        `/follow-ups/${item.id}/status?status=${encodeURIComponent(status)}`,
        { method: 'PATCH' }
      );
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
    }
  }

  async function deleteFollowUp(item: FollowUp) {
    if (!window.confirm(`Delete follow-up for ${item.leadName}?`)) return;

    try {
      setError('');
      await request(`/follow-ups/${item.id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete follow-up');
    }
  }

  return (
    <Shell>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>CUSTOMER RELATIONSHIP</div>
            <h1>Follow-ups</h1>
            <p>Track every customer conversation and the next action for your sales team.</p>
          </div>
          <button className={styles.primaryButton} onClick={openCreate}>
            + Add Follow-up
          </button>
        </div>

        <div className={styles.metrics}>
          <button
            className={`${styles.metricCard} ${statusFilter === 'ALL' ? styles.activeMetric : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <span>Total Follow-ups</span>
            <strong>{metrics.total}</strong>
            <small>All customer activities</small>
          </button>
          <button
            className={`${styles.metricCard} ${statusFilter === 'PLANNED' ? styles.activeMetric : ''}`}
            onClick={() => setStatusFilter('PLANNED')}
          >
            <span>Planned</span>
            <strong>{metrics.planned}</strong>
            <small>Actions still pending</small>
          </button>
          <button
            className={`${styles.metricCard} ${statusFilter === 'COMPLETED' ? styles.activeMetric : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            <span>Completed</span>
            <strong>{metrics.completed}</strong>
            <small>Customer interactions done</small>
          </button>
          <button
            className={`${styles.metricCard} ${statusFilter === 'CANCELLED' ? styles.activeMetric : ''}`}
            onClick={() => setStatusFilter('CANCELLED')}
          >
            <span>Cancelled</span>
            <strong>{metrics.cancelled}</strong>
            <small>Closed without completion</small>
          </button>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Customer Follow-up Register</h2>
              <p>Keep the sales conversation organized from lead to site visit.</p>
            </div>
            <button className={styles.refreshButton} onClick={() => void loadData()}>
              ↻ Refresh
            </button>
          </div>

          <div className={styles.filters}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone, project, employee..."
            />

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="CALL">Call</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MEETING">Meeting</option>
              <option value="EMAIL">Email</option>
            </select>

            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="ALL">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.empty}>Loading follow-ups...</div>
          ) : visibleFollowUps.length === 0 ? (
            <div className={styles.empty}>
              <strong>No follow-ups found</strong>
              <span>Add a follow-up for a customer to start tracking the conversation.</span>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Project</th>
                    <th>Employee</th>
                    <th>Schedule</th>
                    <th>Type</th>
                    <th>Next Follow-up</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFollowUps.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.customerCell}>
                          <div className={styles.avatar}>
                            {item.leadName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <strong>{item.leadName}</strong>
                            <small>{item.leadPhone || 'No phone'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{item.projectName || '—'}</td>
                      <td>{item.assignedToName || '—'}</td>
                      <td>
                        <strong>{formatDate(item.followUpDate)}</strong>
                        <small>{formatTime(item.followUpTime)}</small>
                      </td>
                      <td>
                        <span className={`${styles.typeBadge} ${styles[`type_${item.type}`]}`}>
                          {label(item.type)}
                        </span>
                      </td>
                      <td>{formatDate(item.nextFollowUpDate)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                          {label(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {item.status === 'PLANNED' && (
                            <button onClick={() => void updateStatus(item, 'COMPLETED')}>
                              Complete
                            </button>
                          )}
                          <button onClick={() => openEdit(item)}>Edit</button>
                          <button className={styles.deleteButton} onClick={() => void deleteFollowUp(item)}>
                            Delete
                          </button>
                        </div>
                        {item.notes && <div className={styles.note}>{item.notes}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <div className={styles.overlay} onMouseDown={() => !saving && setShowForm(false)}>
            <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <div className={styles.eyebrow}>SALES ACTIVITY</div>
                  <h2>{editing ? 'Edit Follow-up' : 'Add Follow-up'}</h2>
                </div>
                <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                  ×
                </button>
              </div>

              <form onSubmit={saveFollowUp}>
                <div className={styles.formGrid}>
                  <label>
                    Customer / Lead
                    <select value={form.leadId} onChange={(e) => handleLeadChange(e.target.value)} required>
                      <option value="">Select customer</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name}{lead.phone ? ` — ${lead.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Project
                    <select
                      value={form.projectId}
                      onChange={(e) => setForm((current) => ({ ...current, projectId: e.target.value }))}
                      required
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
                    Assigned Employee
                    <select
                      value={form.assignedToId}
                      onChange={(e) => setForm((current) => ({ ...current, assignedToId: e.target.value }))}
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Follow-up Type
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          type: e.target.value as FollowUp['type'],
                        }))
                      }
                    >
                      <option value="CALL">Call</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="MEETING">Meeting</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </label>

                  <label>
                    Follow-up Date
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(e) => setForm((current) => ({ ...current, followUpDate: e.target.value }))}
                      required
                    />
                  </label>

                  <label>
                    Follow-up Time
                    <input
                      type="time"
                      value={form.followUpTime}
                      onChange={(e) => setForm((current) => ({ ...current, followUpTime: e.target.value }))}
                      required
                    />
                  </label>

                  <label>
                    Next Follow-up Date
                    <input
                      type="date"
                      value={form.nextFollowUpDate}
                      onChange={(e) => setForm((current) => ({ ...current, nextFollowUpDate: e.target.value }))}
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          status: e.target.value as FollowUp['status'],
                        }))
                      }
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </label>

                  <label className={styles.fullWidth}>
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="What did the customer say? What should happen next?"
                      rows={4}
                    />
                  </label>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.formActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Follow-up'}
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

