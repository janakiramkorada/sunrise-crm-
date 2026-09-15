'use client';

import { FormEvent, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { request } from '@/lib/api';
import styles from './projects.module.css';

type Project = {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  state: string;
  projectType: string;
  status: string;
  towers?: number;
  floors?: number;
  inventory?: Record<string, number>;
};

type Tower = {
  id: string;
  projectId: string;
  name: string;
  numberOfFloors: number;
  description: string;
  status: string;
};

const PROJECT_TYPES = ['APARTMENT', 'VILLA', 'PLOT', 'MIXED'];
const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'ON_HOLD'];

function label(value: string) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showTowerForm, setShowTowerForm] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    state: '',
    projectType: 'APARTMENT',
    status: 'PLANNED',
    startDate: '',
    expectedCompletionDate: '',
  });

  const [towerForm, setTowerForm] = useState({
    name: '',
    numberOfFloors: '1',
    description: '',
    status: 'ACTIVE',
  });

  async function loadProjects() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set('q', query.trim());
      }

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      if (typeFilter !== 'ALL') {
        params.set('type', typeFilter);
      }

      const rows = await request(
        `/projects${params.toString() ? `?${params}` : ''}`
      );

      /*
       * IMPORTANT:
       *
       * /api/projects returns basic project information.
       * /api/projects/{id} returns the real tower count.
       *
       * Therefore we load the details for each project so that
       * the project list on the LEFT also shows the correct
       * tower count.
       */
      const enrichedRows = await Promise.all(
        rows.map(async (project: Project) => {
          try {
            return await request(`/projects/${project.id}`);
          } catch {
            return project;
          }
        })
      );

      setProjects(enrichedRows);

      if (selected) {
        const fresh = enrichedRows.find(
          (project: Project) => project.id === selected.id
        );

        if (fresh) {
          setSelected(fresh);
        }
      }

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function selectProject(project: Project) {
    setSelected(project);
    setShowTowerForm(false);

    try {
      const [details, towerRows] = await Promise.all([
        request(`/projects/${project.id}`),
        request(`/projects/${project.id}/towers`),
      ]);

      setSelected(details);
      setTowers(towerRows);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    }
  }

  useEffect(() => {
    loadProjects();

    // Search/filter changes intentionally reload from the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, typeFilter]);

  async function createProject(e: FormEvent) {
    e.preventDefault();

    try {
      await request('/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...projectForm,
          startDate: projectForm.startDate || null,
          expectedCompletionDate:
            projectForm.expectedCompletionDate || null,
        }),
      });

      setProjectForm({
        name: '',
        description: '',
        location: '',
        city: '',
        state: '',
        projectType: 'APARTMENT',
        status: 'PLANNED',
        startDate: '',
        expectedCompletionDate: '',
      });

      setShowCreate(false);

      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  }

  async function createTower(e: FormEvent) {
    e.preventDefault();

    if (!selected) return;

    try {
      await request(`/projects/${selected.id}/towers`, {
        method: 'POST',
        body: JSON.stringify({
          ...towerForm,
          numberOfFloors: Number(towerForm.numberOfFloors),
        }),
      });

      setTowerForm({
        name: '',
        numberOfFloors: '1',
        description: '',
        status: 'ACTIVE',
      });

      setShowTowerForm(false);

      await selectProject(selected);
      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to create tower');
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete ${project.name}?`)) return;

    try {
      await request(`/projects/${project.id}`, {
        method: 'DELETE',
      });

      setSelected(null);
      setTowers([]);

      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  }

  return (
    <Shell>
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>PROPERTY DEVELOPMENT</div>

          <h2>Projects</h2>

          <p>
            Manage developments, towers and the inventory structure from one
            place.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          onClick={() => setShowCreate(true)}
        >
          + Add project
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span>⌕</span>

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search project name"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All types</option>

          {PROJECT_TYPES.map(value => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>

          {PROJECT_STATUSES.map(value => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.layout}>
        <div className={styles.listPanel}>
          <div className={styles.panelHead}>
            <div>
              <strong>Projects</strong>

              <span>
                {projects.length} project
                {projects.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className={styles.empty}>
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className={styles.empty}>
              No projects match your filters.
            </div>
          ) : (
            <div className={styles.projectList}>
              {projects.map(project => (
                <button
                  type="button"
                  key={project.id}
                  className={`${styles.projectRow} ${
                    selected?.id === project.id
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() => selectProject(project)}
                >
                  <div className={styles.projectLogo}>
                    {project.name.slice(0, 1).toUpperCase()}
                  </div>

                  <div className={styles.projectMain}>
                    <strong>{project.name}</strong>

                    <span>
                      {project.city}, {project.state}
                    </span>

                    <small>{project.location}</small>
                  </div>

                  <div className={styles.projectStats}>
                    <span
                      className={`${styles.status} ${
                        styles[
                          `status_${project.status.toLowerCase()}`
                        ]
                      }`}
                    >
                      {label(project.status)}
                    </span>

                    <div>
                      <b>{project.towers ?? 0}</b>{' '}
                      {project.towers === 1 ? 'tower' : 'towers'}
                    </div>
                  </div>

                  <span className={styles.arrow}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.detailPanel}>
          {!selected ? (
            <div className={styles.emptyDetail}>
              <div className={styles.emptyIcon}>⌂</div>

              <h3>Select a project</h3>

              <p>
                Choose a project from the list to see its development
                structure, inventory and towers.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.detailHero}>
                <div>
                  <div className={styles.kicker}>
                    {label(selected.projectType)} DEVELOPMENT
                  </div>

                  <h3>{selected.name}</h3>

                  <p>
                    {selected.description ||
                      'No project description added yet.'}
                  </p>

                  <div className={styles.location}>
                    ⌖ {selected.location} · {selected.city},{' '}
                    {selected.state}
                  </div>
                </div>

                <div
                  className={`${styles.statusLarge} ${
                    styles[
                      `status_${selected.status.toLowerCase()}`
                    ]
                  }`}
                >
                  {label(selected.status)}
                </div>
              </div>

              <div className={styles.statGrid}>
                <div>
                  <span>Towers</span>

                  <strong>
                    {selected.towers ?? towers.length}
                  </strong>
                </div>

                <div>
                  <span>Floors</span>

                  <strong>
                    {selected.floors ?? '—'}
                  </strong>
                </div>

                <div>
                  <span>Available</span>

                  <strong>
                    {selected.inventory?.available ?? 0}
                  </strong>
                </div>

                <div>
                  <span>Booked</span>

                  <strong>
                    {selected.inventory?.booked ?? 0}
                  </strong>
                </div>
              </div>

              <div className={styles.sectionBar}>
                <div>
                  <strong>Towers</strong>

                  <span>
                    {towers.length} tower
                    {towers.length === 1 ? '' : 's'} in this project
                  </span>
                </div>

                <button
                  className={styles.secondaryButton}
                  onClick={() =>
                    setShowTowerForm(value => !value)
                  }
                >
                  + Add tower
                </button>
              </div>

              {showTowerForm && (
                <form
                  className={styles.formCard}
                  onSubmit={createTower}
                >
                  <input
                    required
                    value={towerForm.name}
                    onChange={e =>
                      setTowerForm({
                        ...towerForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Tower name"
                  />

                  <input
                    required
                    type="number"
                    min="1"
                    value={towerForm.numberOfFloors}
                    onChange={e =>
                      setTowerForm({
                        ...towerForm,
                        numberOfFloors: e.target.value,
                      })
                    }
                    placeholder="Floors"
                  />

                  <input
                    value={towerForm.description}
                    onChange={e =>
                      setTowerForm({
                        ...towerForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Description"
                  />

                  <select
                    value={towerForm.status}
                    onChange={e =>
                      setTowerForm({
                        ...towerForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setShowTowerForm(false)}
                    >
                      Cancel
                    </button>

                    <button
                      className={styles.primaryButton}
                      type="submit"
                    >
                      Save tower
                    </button>
                  </div>
                </form>
              )}

              <div className={styles.towerGrid}>
                {towers.length === 0 ? (
                  <div className={styles.emptyTower}>
                    No towers created yet.
                  </div>
                ) : (
                  towers.map(tower => (
                    <div
                      className={styles.towerCard}
                      key={tower.id}
                    >
                      <div className={styles.towerIcon}>
                        ▥
                      </div>

                      <div>
                        <strong>{tower.name}</strong>

                        <span>
                          {tower.numberOfFloors} floors
                        </span>

                        <small>
                          {tower.description ||
                            'No description'}
                        </small>
                      </div>

                      <span className={styles.towerStatus}>
                        {label(tower.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.dangerZone}>
                <div>
                  <strong>Project administration</strong>

                  <span>
                    Delete this project only when you are sure the
                    related data is no longer needed.
                  </span>
                </div>

                <button
                  className={styles.deleteButton}
                  onClick={() => deleteProject(selected)}
                >
                  Delete project
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {showCreate && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setShowCreate(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.kicker}>
                  NEW DEVELOPMENT
                </div>

                <h3>Add project</h3>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={createProject}
              className={styles.createForm}
            >
              <div className={styles.twoCol}>
                <label>
                  Project name

                  <input
                    required
                    value={projectForm.name}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        name: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Project type

                  <select
                    value={projectForm.projectType}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        projectType: e.target.value,
                      })
                    }
                  >
                    {PROJECT_TYPES.map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Description

                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={e =>
                    setProjectForm({
                      ...projectForm,
                      description: e.target.value,
                    })
                  }
                />
              </label>

              <div className={styles.twoCol}>
                <label>
                  Location

                  <input
                    required
                    value={projectForm.location}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        location: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  City

                  <input
                    required
                    value={projectForm.city}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        city: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className={styles.twoCol}>
                <label>
                  State

                  <input
                    required
                    value={projectForm.state}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        state: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Status

                  <select
                    value={projectForm.status}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        status: e.target.value,
                      })
                    }
                  >
                    {PROJECT_STATUSES.map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.twoCol}>
                <label>
                  Start date

                  <input
                    type="date"
                    value={projectForm.startDate}
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        startDate: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Expected completion

                  <input
                    type="date"
                    value={
                      projectForm.expectedCompletionDate
                    }
                    onChange={e =>
                      setProjectForm({
                        ...projectForm,
                        expectedCompletionDate:
                          e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                >
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}


