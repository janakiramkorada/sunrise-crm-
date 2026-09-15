'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';

type Employee = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  active: boolean;
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const data = await request('/employees');
      setEmployees(data);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Unable to load employees'
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Shell>
      <h1>Employees</h1>

      {message && <p>{message}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td>{employee.role}</td>
                <td>
                  <span className="badge">
                    {employee.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}