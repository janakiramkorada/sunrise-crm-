package com.sunrise.crm;

import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

enum FollowUpType {
    CALL,
    WHATSAPP,
    MEETING,
    EMAIL
}

enum FollowUpStatus {
    PLANNED,
    COMPLETED,
    CANCELLED
}

@Entity
@Table(name = "follow_ups")
class FollowUp {

    @Id
    UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "lead_id", nullable = false)
    Lead lead;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    Project project;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "assigned_to", nullable = false)
    User assignedTo;

    @Column(name = "follow_up_date", nullable = false)
    LocalDate followUpDate;

    @Column(name = "follow_up_time", nullable = false)
    LocalTime followUpTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    FollowUpType type;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Column(name = "next_follow_up_date")
    LocalDate nextFollowUpDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    FollowUpStatus status = FollowUpStatus.PLANNED;

    @Column(name = "created_at")
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt = Instant.now();

    FollowUp() {}
}

interface FollowUpRepo extends org.springframework.data.jpa.repository.JpaRepository<FollowUp, UUID> {
    List<FollowUp> findAllByOrderByFollowUpDateDescFollowUpTimeDesc();
    List<FollowUp> findByLeadIdOrderByFollowUpDateDescFollowUpTimeDesc(UUID leadId);
    List<FollowUp> findByAssignedToIdOrderByFollowUpDateDescFollowUpTimeDesc(UUID userId);
    List<FollowUp> findByProjectIdOrderByFollowUpDateDescFollowUpTimeDesc(UUID projectId);
}

record FollowUpRequest(
        @NotBlank String leadId,
        @NotBlank String projectId,
        @NotBlank String assignedToId,
        @NotNull LocalDate followUpDate,
        @NotNull LocalTime followUpTime,
        @NotNull FollowUpType type,
        String notes,
        LocalDate nextFollowUpDate,
        @NotNull FollowUpStatus status
) {}

@RestController
@RequestMapping("/api/follow-ups")
class FollowUpController {

    final FollowUpRepo followUps;
    final LeadRepo leads;
    final ProjectRepo projects;
    final UserRepo users;

    FollowUpController(
            FollowUpRepo followUps,
            LeadRepo leads,
            ProjectRepo projects,
            UserRepo users) {
        this.followUps = followUps;
        this.leads = leads;
        this.projects = projects;
        this.users = users;
    }

    @GetMapping
    List<Map<String, Object>> list(
            @RequestParam(required = false) UUID leadId,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID projectId) {

        List<FollowUp> rows;

        if (leadId != null) {
            rows = followUps.findByLeadIdOrderByFollowUpDateDescFollowUpTimeDesc(leadId);
        } else if (employeeId != null) {
            rows = followUps.findByAssignedToIdOrderByFollowUpDateDescFollowUpTimeDesc(employeeId);
        } else if (projectId != null) {
            rows = followUps.findByProjectIdOrderByFollowUpDateDescFollowUpTimeDesc(projectId);
        } else {
            rows = followUps.findAllByOrderByFollowUpDateDescFollowUpTimeDesc();
        }

        return rows.stream().map(this::toMap).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    Map<String, Object> get(@PathVariable UUID id) {
        return toMap(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> create(@Valid @RequestBody FollowUpRequest request) {
        FollowUp followUp = new FollowUp();
        apply(followUp, request);
        return toMap(followUps.save(followUp));
    }

    @PutMapping("/{id}")
    Map<String, Object> update(
            @PathVariable UUID id,
            @Valid @RequestBody FollowUpRequest request) {

        FollowUp followUp = find(id);
        apply(followUp, request);
        followUp.updatedAt = Instant.now();
        return toMap(followUps.save(followUp));
    }

    @PatchMapping("/{id}/status")
    Map<String, Object> updateStatus(
            @PathVariable UUID id,
            @RequestParam FollowUpStatus status) {

        FollowUp followUp = find(id);
        followUp.status = status;
        followUp.updatedAt = Instant.now();
        return toMap(followUps.save(followUp));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        followUps.delete(find(id));
    }

    private void apply(FollowUp target, FollowUpRequest request) {
        UUID leadId = parseUuid(request.leadId(), "leadId");
        UUID projectId = parseUuid(request.projectId(), "projectId");
        UUID assignedToId = parseUuid(request.assignedToId(), "assignedToId");

        Lead lead = leads.findById(leadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lead not found"));

        Project project = projects.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found"));

        User employee = users.findById(assignedToId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned employee not found"));

        if (lead.project == null || !lead.project.id.equals(project.id)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selected project does not match the lead's project");
        }

        if (employee.role != Role.EMPLOYEE || !employee.active) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Follow-up must be assigned to an active employee");
        }

        if (request.nextFollowUpDate() != null &&
                request.nextFollowUpDate().isBefore(request.followUpDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Next follow-up date cannot be before the current follow-up date");
        }

        target.lead = lead;
        target.project = project;
        target.assignedTo = employee;
        target.followUpDate = request.followUpDate();
        target.followUpTime = request.followUpTime();
        target.type = request.type();
        target.notes = request.notes();
        target.nextFollowUpDate = request.nextFollowUpDate();
        target.status = request.status() == null ? FollowUpStatus.PLANNED : request.status();

        if (target.createdAt == null) {
            target.createdAt = Instant.now();
        }
        target.updatedAt = Instant.now();
    }

    private FollowUp find(UUID id) {
        return followUps.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Follow-up not found"));
    }

    private UUID parseUuid(String value, String field) {
        try {
            return UUID.fromString(value);
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid " + field);
        }
    }

    private Map<String, Object> toMap(FollowUp f) {
        Map<String, Object> m = new LinkedHashMap<>();

        m.put("id", f.id);
        m.put("leadId", f.lead.id);
        m.put("leadName", f.lead.name);
        m.put("leadPhone", f.lead.phone);

        m.put("projectId", f.project.id);
        m.put("projectName", f.project.name);

        m.put("assignedToId", f.assignedTo.id);
        m.put("assignedToName", f.assignedTo.name);

        m.put("followUpDate", f.followUpDate);
        m.put("followUpTime", f.followUpTime);
        m.put("type", f.type);
        m.put("notes", f.notes);
        m.put("nextFollowUpDate", f.nextFollowUpDate);
        m.put("status", f.status);

        m.put("createdAt", f.createdAt);
        m.put("updatedAt", f.updatedAt);

        return m;
    }
}

