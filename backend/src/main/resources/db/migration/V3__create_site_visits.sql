CREATE TABLE site_visits (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    tower_id UUID REFERENCES towers(id),
    unit_id UUID REFERENCES units(id),
    assigned_to UUID REFERENCES users(id),
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_site_visits_lead ON site_visits(lead_id);
CREATE INDEX idx_site_visits_project ON site_visits(project_id);
CREATE INDEX idx_site_visits_assigned_to ON site_visits(assigned_to);
CREATE INDEX idx_site_visits_date ON site_visits(visit_date);
