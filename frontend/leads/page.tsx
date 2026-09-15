'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';

type Lead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  notes?: string;
  status: string;
  project: string;
  assignedTo?: string;
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

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function load() {
    try {
      const data = await request('/leads');
      setLeads(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load leads');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      await request(`/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to update status');
    }
  }

  const filtered =
    statusFilter === 'ALL'
      ? leads
      : leads.filter((lead) => lead.status === statusFilter);

  return (
    <Shell>
      <h1>Leads</h1>

      <div className="toolbar card">
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

        <button onClick={() => void load()}>Refresh</button>
      </div>

      {message && <p>{message}</p>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Source</th>
            <th>Project</th>
            <th>Assigned To</th>
            <th>Status</th>
            <th>Change Status</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.name}</td>
              <td>{lead.phone}</td>
              <td>{lead.source}</td>
              <td>{lead.project}</td>
              <td>{lead.assignedTo || '-'}</td>

              <td>
                <span className="badge">{lead.status}</span>
              </td>

              <td>
                <select
                  value={lead.status}
                  onChange={(e) =>
                    void updateStatus(lead.id, e.target.value)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}