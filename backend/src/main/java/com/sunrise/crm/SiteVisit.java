package com.sunrise.crm;

import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.*;

enum SiteVisitStatus {
    SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED
}

@Entity
@Table(name = "site_visits")
class SiteVisit {
    @Id UUID id = UUID.randomUUID();

    @ManyToOne(optional = false)
    @JoinColumn(name = "lead_id")
    Lead lead;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    Project project;

    @ManyToOne @JoinColumn(name = "tower_id")
    Tower tower;

    @ManyToOne @JoinColumn(name = "unit_id")
    Unit unit;

    @ManyToOne @JoinColumn(name = "assigned_to")
    User assignedTo;

    @Column(name = "visit_date", nullable = false)
    LocalDate visitDate;

    @Column(name = "visit_time", nullable = false)
    LocalTime visitTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    SiteVisitStatus status = SiteVisitStatus.SCHEDULED;

    String notes;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    SiteVisit() {}
}

interface SiteVisitRepo extends org.springframework.data.jpa.repository.JpaRepository<SiteVisit, UUID> {
    List<SiteVisit> findByLeadId(UUID leadId);
    List<SiteVisit> findByProjectId(UUID projectId);
    List<SiteVisit> findByAssignedToId(UUID userId);
}

record SiteVisitRequest(
        @NotNull UUID leadId,
        @NotNull UUID projectId,
        UUID towerId,
        UUID unitId,
        UUID assignedToId,
        @NotNull LocalDate visitDate,
        @NotNull LocalTime visitTime,
        SiteVisitStatus status,
        String notes) {}

@RestController
@RequestMapping("/api")
class SiteVisitController {
    final SiteVisitRepo visits;
    final LeadRepo leads;
    final ProjectRepo projects;
    final TowerRepo towers;
    final UnitRepo units;
    final UserRepo users;

    SiteVisitController(SiteVisitRepo v, LeadRepo l, ProjectRepo p,
                        TowerRepo t, UnitRepo u, UserRepo r) {
        visits = v; leads = l; projects = p; towers = t; units = u; users = r;
    }

    @GetMapping("/site-visits")
    List<Map<String,Object>> list(
            @RequestParam(required=false) SiteVisitStatus status,
            @RequestParam(required=false) UUID projectId,
            @RequestParam(required=false) UUID assignedToId,
            @RequestParam(required=false) UUID leadId,
            @RequestParam(required=false) String q) {

        return visits.findAll().stream()
                .filter(v -> status == null || v.status == status)
                .filter(v -> projectId == null || v.project.id.equals(projectId))
                .filter(v -> assignedToId == null ||
                        (v.assignedTo != null && v.assignedTo.id.equals(assignedToId)))
                .filter(v -> leadId == null || v.lead.id.equals(leadId))
                .filter(v -> q == null || q.isBlank() ||
                        v.lead.name.toLowerCase().contains(q.toLowerCase()) ||
                        v.lead.phone.toLowerCase().contains(q.toLowerCase()) ||
                        v.project.name.toLowerCase().contains(q.toLowerCase()))
                .sorted(Comparator.comparing((SiteVisit v) -> v.visitDate)
                        .thenComparing(v -> v.visitTime).reversed())
                .map(this::map).toList();
    }

    @GetMapping("/site-visits/{id}")
    Map<String,Object> get(@PathVariable UUID id) {
        return map(find(id));
    }

    @PostMapping("/site-visits")
    Map<String,Object> create(@Valid @RequestBody SiteVisitRequest r) {
        SiteVisit v = new SiteVisit();
        apply(v, r);
        return map(visits.save(v));
    }

    @PutMapping("/site-visits/{id}")
    Map<String,Object> update(@PathVariable UUID id,
                               @Valid @RequestBody SiteVisitRequest r) {
        SiteVisit v = find(id);
        apply(v, r);
        return map(visits.save(v));
    }

    @PatchMapping("/site-visits/{id}/status")
    Map<String,Object> updateStatus(@PathVariable UUID id,
                                     @RequestBody Map<String,String> body) {
        SiteVisit v = find(id);
        try {
            v.status = SiteVisitStatus.valueOf(body.getOrDefault("status",""));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid site visit status");
        }
        v.updatedAt = Instant.now();
        return map(visits.save(v));
    }

    @DeleteMapping("/site-visits/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        visits.delete(find(id));
    }

    private SiteVisit find(UUID id) {
        return visits.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Site visit not found"));
    }

    private void apply(SiteVisit v, SiteVisitRequest r) {
        Lead lead = leads.findById(r.leadId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));

        Project project = projects.findById(r.projectId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        if (lead.project != null && !lead.project.id.equals(project.id))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Lead and project must match");

        v.lead = lead;
        v.project = project;
        v.visitDate = r.visitDate();
        v.visitTime = r.visitTime();
        v.status = r.status() == null ? SiteVisitStatus.SCHEDULED : r.status();
        v.notes = r.notes();

        v.assignedTo = r.assignedToId() == null ? null :
                users.findById(r.assignedToId()).orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Employee not found"));

        v.tower = null;
        if (r.towerId() != null) {
            Tower tower = towers.findById(r.towerId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Tower not found"));
            if (!tower.project.id.equals(project.id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tower does not belong to selected project");
            v.tower = tower;
        }

        v.unit = null;
        if (r.unitId() != null) {
            Unit unit = units.findById(r.unitId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Unit not found"));
            if (!unit.project.id.equals(project.id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unit does not belong to selected project");
            if (v.tower != null && !unit.tower.id.equals(v.tower.id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unit does not belong to selected tower");
            v.unit = unit;
        }

        v.updatedAt = Instant.now();
    }

    private Map<String,Object> map(SiteVisit v) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", v.id);
        m.put("leadId", v.lead.id);
        m.put("leadName", v.lead.name);
        m.put("leadPhone", v.lead.phone);
        m.put("projectId", v.project.id);
        m.put("projectName", v.project.name);
        m.put("towerId", v.tower == null ? null : v.tower.id);
        m.put("towerName", v.tower == null ? "" : v.tower.name);
        m.put("unitId", v.unit == null ? null : v.unit.id);
        m.put("unitNumber", v.unit == null ? "" : v.unit.unitNumber);
        m.put("assignedToId", v.assignedTo == null ? null : v.assignedTo.id);
        m.put("assignedToName", v.assignedTo == null ? "" : v.assignedTo.name);
        m.put("visitDate", v.visitDate);
        m.put("visitTime", v.visitTime);
        m.put("status", v.status);
        m.put("notes", v.notes == null ? "" : v.notes);
        m.put("createdAt", v.createdAt);
        m.put("updatedAt", v.updatedAt);
        return m;
    }
}
