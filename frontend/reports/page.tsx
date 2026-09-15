'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';

type Report = {
  totalLeads: number;
  siteVisitLeads: number;
  bookedLeads: number;
  lostLeads: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  employeePerformance: {
    userId: string;
    name: string;
    role: string;
    totalLeads: number;
    bookedLeads: number;
    conversionRate: number;
  }[];
};

export default function Reports() {
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const data = await request('/reports/overview');
      setReport(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load reports');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (!report) {
    return (
      <Shell>
        <h1>Reports</h1>
        {message ? <p>{message}</p> : <p>Loading reports...</p>}
      </Shell>
    );
  }

  return (
    <Shell>
      <h1>Reports</h1>

      <div className="grid">
        <div className="card">
          <h3>Total Leads</h3>
          <strong>{report.totalLeads}</strong>
        </div>

        <div className="card">
          <h3>Site Visits</h3>
          <strong>{report.siteVisitLeads}</strong>
        </div>

        <div className="card">
          <h3>Booked</h3>
          <strong>{report.bookedLeads}</strong>
        </div>

        <div className="card">
          <h3>Lost</h3>
          <strong>{report.lostLeads}</strong>
        </div>
      </div>

      <div className="card">
        <h2>Lead Status</h2>

        {Object.entries(report.statusCounts).map(([status, count]) => (
          <p key={status}>
            <b>{status.replace('_', ' ')}</b>: {count}
          </p>
        ))}
      </div>

      <div className="card">
        <h2>Lead Sources</h2>

        {Object.entries(report.sourceCounts).map(([source, count]) => (
          <p key={source}>
            <b>{source}</b>: {count}
          </p>
        ))}
      </div>

      <div className="card">
        <h2>Employee Performance</h2>

        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Total Leads</th>
              <th>Booked</th>
              <th>Conversion</th>
            </tr>
          </thead>

          <tbody>
            {report.employeePerformance.map((employee) => (
              <tr key={employee.userId}>
                <td>{employee.name}</td>
                <td>{employee.role}</td>
                <td>{employee.totalLeads}</td>
                <td>{employee.bookedLeads}</td>
                <td>{employee.conversionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}