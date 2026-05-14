package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.DebriefingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "pr_debriefing")
public class PrDebriefing extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_subject_id")
    private CycleSubject cycleSubject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdm_user_id")
    private User pdmUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DebriefingStatus status;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "conducted_at")
    private Instant conductedAt;

    @Column(name = "notes")
    private String notes;

    public CycleSubject getCycleSubject() {
        return cycleSubject;
    }

    public void setCycleSubject(CycleSubject cycleSubject) {
        this.cycleSubject = cycleSubject;
    }

    public User getPdmUser() {
        return pdmUser;
    }

    public void setPdmUser(User pdmUser) {
        this.pdmUser = pdmUser;
    }

    public DebriefingStatus getStatus() {
        return status;
    }

    public void setStatus(DebriefingStatus status) {
        this.status = status;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public Instant getConductedAt() {
        return conductedAt;
    }

    public void setConductedAt(Instant conductedAt) {
        this.conductedAt = conductedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
