'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './leads.module.css';

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'SITE_VISIT' | 'NEGOTIATION' | 'BOOKED' | 'LOST';
type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  status: LeadStatus;
  projectId?: string;
  project?: string;
  assignedToId?: string;
  assignedTo?: string;
};
type User = { id: string; name: string; email: string; role: string; active: boolean };
type Project = { id: string; name: string; city?: string; state?: string; status?: string };

type FormState = {
  name: string;
  phone: string;
  email: string;
  source: string;
  projectId: string;
  assignedToId: string;
  status: LeadStatus;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
};

const emptyForm: FormState = {
  name: '', phone: '', email: '', source: 'WEBSITE', projectId: '', assignedToId: '', status: 'NEW',
  address: '', city: '', state: '', pincode: '', notes: '',
};

const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'BOOKED', 'LOST'];
const sources = ['WEBSITE', 'WHATSAPP', 'REFERRAL', 'WALK_IN', 'PHONE', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE_ADS', 'PROPERTY_PORTAL', 'CAMPAIGN'];

function displayStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [leadRows, userRows, projectRows] = await Promise.all([
        request('/leads'), request('/users'), request('/projects'),
      ]);
      setLeads(leadRows);
      setUsers(userRows);
      setProjects(projectRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((lead) => {
      const haystack = [lead.name, lead.phone, lead.email, lead.source, lead.project, lead.assignedTo,
        lead.address, lead.city, lead.state, lead.pincode].filter(Boolean).join(' ').toLowerCase();
      return (!needle || haystack.includes(needle)) &&
        (statusFilter === 'ALL' || lead.status === statusFilter);
    });
  }, [leads, q, statusFilter]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, projectId: projects.length === 1 ? projects[0].id : '' });
    setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name || '', phone: lead.phone || '', email: lead.email || '', source: lead.source || 'WEBSITE',
      projectId: lead.projectId || '', assignedToId: lead.assignedToId || '', status: lead.status || 'NEW',
      address: lead.address || '', city: lead.city || '', state: lead.state || '', pincode: lead.pincode || '', notes: lead.notes || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (!saving) setModalOpen(false);
  }

  async function saveLead(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null,
        source: form.source, status: form.status,
        projectId: form.projectId || null, assignedToId: form.assignedToId || null,
        address: form.address.trim(), city: form.city.trim() || null, state: form.state.trim() || null,
        pincode: form.pincode.trim() || null, notes: form.notes.trim() || null,
      };
      if (editing) await request(`/leads/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await request('/leads', { method: 'POST', body: JSON.stringify(payload) });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, nextStatus: LeadStatus) {
    try {
      await request(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status: nextStatus } : lead));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  return (
    <Shell>
      <div className={styles.page}>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>SALES PIPELINE</p>
            <h1>Leads</h1>
            <p className={styles.subtitle}>Manage customer enquiries and keep ownership clear from first contact to booking.</p>
          </div>
          <button className={styles.primaryButton} onClick={openAdd}>+ Add Lead</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>Lead register</h2><p>{filtered.length} leads shown</p></div>
            <button className={styles.secondaryButton} onClick={() => void load()} disabled={loading}>Refresh</button>
          </div>
          <div className={styles.filters}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, phone, project or employee..." />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{displayStatus(value)}</option>)}
            </select>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>PROJECT</th><th>ADDRESS</th><th>ASSIGNED TO</th><th>STATUS</th><th>ACTION</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className={styles.empty}>Loading leads...</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className={styles.empty}>No leads found.</td></tr> : filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td><strong>{lead.name}</strong></td>
                    <td><div>{lead.phone}</div><small>{lead.email || '—'}</small></td>
                    <td>{lead.project || '—'}</td>
                    <td><div>{lead.address || '—'}</div><small>{[lead.city, lead.state, lead.pincode].filter(Boolean).join(', ')}</small></td>
                    <td>{lead.assignedTo || 'Unassigned'}</td>
                    <td>
                      <select className={styles.statusSelect} value={lead.status} onChange={(e) => void changeStatus(lead.id, e.target.value as LeadStatus)}>
                        {statuses.map((value) => <option key={value} value={value}>{displayStatus(value)}</option>)}
                      </select>
                    </td>
                    <td><button className={styles.editButton} onClick={() => openEdit(lead)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {modalOpen && (
          <div className={styles.overlay} onMouseDown={closeModal}>
            <form className={styles.modal} onSubmit={saveLead} onMouseDown={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div><p className={styles.eyebrow}>CUSTOMER INFORMATION</p><h2>{editing ? 'Edit Lead' : 'Add Lead'}</h2><p>Enter the customer enquiry details.</p></div>
                <button type="button" className={styles.closeButton} onClick={closeModal}>×</button>
              </div>
              <div className={styles.formGrid}>
                <label>Customer Name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter customer name" /></label>
                <label>Phone Number *<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Enter phone number" /></label>
                <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="customer@example.com" /></label>
                <label>Lead Source<select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{sources.map((value) => <option key={value} value={value}>{displayStatus(value)}</option>)}</select></label>
                <label>Project<select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <label>Assigned Employee<select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}><option value="">Select employee</option>{users.filter((u) => u.role === 'EMPLOYEE' && u.active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label className={styles.full}>Address *<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House / street / area" /></label>
                <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" /></label>
                <label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" /></label>
                <label>Pincode<input inputMode="numeric" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" /></label>
                <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>{statuses.map((value) => <option key={value} value={value}>{displayStatus(value)}</option>)}</select></label>
                <label className={styles.full}>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add any useful customer or enquiry notes..." /></label>
              </div>
              <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={closeModal}>Cancel</button><button className={styles.primaryButton} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Save Lead'}</button></div>
            </form>
          </div>
        )}
      </div>
    </Shell>
  );
}
