'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';

type Employee = { id: string; name: string; email: string; role: string; active: boolean };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/employees')
      .then(setEmployees)
      .catch((err: Error) => setError(err.message || 'Failed to load employees'));
  }, []);

  return (
    <Shell>
      <div className="page-intro">
        <div>
          <div className="eyebrow">TEAM MANAGEMENT</div>
          <h2>Employees</h2>
          <p>Monitor your sales team and keep ownership clear.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-toolbar">
          <div><h3>Active team</h3><span>{employees.length} employees</span></div>
        </div>

        {error ? <div className="empty-state">{error}</div> : (
          <div className="people-grid">
            {employees.map((e) => (
              <div className="person-card" key={e.id}>
                <div className="person-avatar">{e.name.slice(0, 1).toUpperCase()}</div>
                <div className="person-main">
                  <strong>{e.name}</strong>
                  <span>{e.email}</span>
                  <div className="person-meta">
                    <span className="role-badge">{e.role}</span>
                    <span className={`active-badge ${e.active ? 'on' : 'off'}`}>{e.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
