-- Follow-up activity history for the lead/customer sales workflow

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    assigned_to UUID NOT NULL REFERENCES users(id),
    follow_up_date DATE NOT NULL,
    follow_up_time TIME NOT NULL,
    type VARCHAR(30) NOT NULL,
    notes TEXT,
    next_follow_up_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_follow_up_type
        CHECK (type IN ('CALL', 'WHATSAPP', 'MEETING', 'EMAIL')),

    CONSTRAINT chk_follow_up_status
        CHECK (status IN ('PLANNED', 'COMPLETED', 'CANCELLED')),

    CONSTRAINT chk_follow_up_next_date
        CHECK (next_follow_up_date IS NULL OR next_follow_up_date >= follow_up_date)
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead
    ON follow_ups(lead_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_project
    ON follow_ups(project_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to
    ON follow_ups(assigned_to);

CREATE INDEX IF NOT EXISTS idx_follow_ups_date
    ON follow_ups(follow_up_date);
