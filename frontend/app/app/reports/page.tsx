'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/reports/overview')
      .then(setData)
      .catch((err: Error) => setError(err.message || 'Failed to load reports'));
  }, []);

  return (
    <Shell>
      <div className="page-intro">
        <div>
          <div className="eyebrow">BUSINESS INTELLIGENCE</div>
          <h2>Reports</h2>
          <p>Understand pipeline health, source quality and team conversion.</p>
        </div>
      </div>

      {error ? <div className="empty-state">{error}</div> : !data ? <div className="empty-state">Loading reports…</div> : (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span>Total leads</span><strong>{data.totalLeads}</strong><small>All captured enquiries</small></div>
            <div className="stat-card"><span>Site visits</span><strong>{data.siteVisitLeads}</strong><small>Leads at site visit stage</small></div>
            <div className="stat-card"><span>Booked</span><strong>{data.bookedLeads}</strong><small>Successful bookings</small></div>
            <div className="stat-card"><span>Lost</span><strong>{data.lostLeads}</strong><small>Closed without booking</small></div>
          </div>

          <div className="report-grid">
            <section className="panel">
              <div className="panel-title"><h3>Lead status</h3><span>Current pipeline</span></div>
              <div className="bar-list">
                {Object.entries(data.statusCounts || {}).map(([k, v]: any) => (
                  <div className="bar-row" key={k}>
                    <span>{k.replace(/_/g, ' ')}</span><b>{v}</b>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${data.totalLeads ? Math.max(4, (v / data.totalLeads) * 100) : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-title"><h3>Lead sources</h3><span>Acquisition mix</span></div>
              <div className="source-grid">
                {Object.entries(data.sourceCounts || {}).map(([k, v]: any) => (
                  <div className="source-card" key={k}><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-toolbar"><div><h3>Employee performance</h3><span>Lead ownership and conversion</span></div></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Role</th><th>Leads</th><th>Booked</th><th>Conversion</th></tr></thead>
                <tbody>
                  {(data.employeePerformance || []).map((e: any) => (
                    <tr key={e.userId}>
                      <td><strong>{e.name}</strong></td>
                      <td>{e.role}</td>
                      <td>{e.totalLeads}</td>
                      <td>{e.bookedLeads}</td>
                      <td><strong>{e.conversionRate}%</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
