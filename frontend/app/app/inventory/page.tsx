'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';

type Unit = Record<string, any>;

const statusClass = (s: string) =>
  `status-badge status-${String(s || '').toLowerCase()}`;

export default function InventoryPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    request('/inventory')
      .then(setUnits)
      .catch((err: Error) =>
        setError(err.message || 'Failed to load inventory')
      );
  }, []);

  const filtered = useMemo(
    () =>
      units.filter((u) => {
        const text = `
          ${u.unitNumber || u.number || ''}
          ${u.projectName || u.project || ''}
          ${u.towerName || u.tower || ''}
        `.toLowerCase();

        const statusMatch =
          status === 'ALL' ||
          String(u.status || '').toUpperCase() === status;

        return text.includes(q.toLowerCase()) && statusMatch;
      }),
    [units, q, status]
  );

  const counts = ['AVAILABLE', 'BLOCKED', 'BOOKED', 'SOLD'].map((s) => ({
    status: s,
    count: units.filter(
      (u) => String(u.status || '').toUpperCase() === s
    ).length,
  }));

  return (
    <Shell>
      <div className="page-intro">
        <div>
          <div className="eyebrow">PROPERTY INVENTORY</div>
          <h2>Units & availability</h2>
          <p>
            Search, review and manage every unit across your projects.
          </p>
        </div>
      </div>

      <div className="stat-strip">
        {counts.map((c) => (
          <button
            key={c.status}
            className={`mini-stat ${
              status === c.status ? 'selected' : ''
            }`}
            onClick={() =>
              setStatus(status === c.status ? 'ALL' : c.status)
            }
          >
            <span>{c.status}</span>
            <strong>{c.count}</strong>
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="panel-toolbar">
          <div>
            <h3>Inventory register</h3>
            <span>{filtered.length} units shown</span>
          </div>

          <div className="toolbar-controls">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search unit, project or tower"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="BLOCKED">Blocked</option>
              <option value="BOOKED">Booked</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="empty-state">{error}</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Project</th>
                  <th>Tower</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id || i}>
                    <td>
                      <strong>
                        {u.unitNumber || u.number || '—'}
                      </strong>
                    </td>

                    <td>
                      {u.projectName ||
                        u.project ||
                        'Sunrise Residency'}
                    </td>

                    <td>
                      {u.towerName || u.tower || 'Tower A'}
                    </td>

                    <td>
                      {u.floorNumber ?? u.floor ?? '—'}
                    </td>

                    <td>
                      {u.propertyType || u.type || '—'}
                    </td>

                    <td>
                      {u.areaSqFt ?? u.area ?? '—'} sq.ft
                    </td>

                    <td>
                      {u.currentPrice != null
                        ? `₹${Number(
                            u.currentPrice
                          ).toLocaleString('en-IN')}`
                        : '—'}
                    </td>

                    <td>
                      <span className={statusClass(u.status)}>
                        {u.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        No units found.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}