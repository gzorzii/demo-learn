package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.AllocationModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cycle_subject")
public class CycleSubject extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id")
    private Cycle cycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_group_id")
    private PrCycleGroup cycleGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_user_id")
    private User subjectUser;

    @Column(name = "status", nullable = false)
    private String status;

    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_model")
    private AllocationModel allocationModel;

    @Column(name = "validation_deadline")
    private Instant validationDeadline;

    @Column(name = "validated_at")
    private Instant validatedAt;

    @Column(name = "collection_start_at")
    private Instant collectionStartAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "submitted_for_calibration_at")
    private Instant submittedForCalibrationAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public Cycle getCycle() {
        return cycle;
    }

    public void setCycle(Cycle cycle) {
        this.cycle = cycle;
    }

    public PrCycleGroup getCycleGroup() {
        return cycleGroup;
    }

    public void setCycleGroup(PrCycleGroup cycleGroup) {
        this.cycleGroup = cycleGroup;
    }

    public User getSubjectUser() {
        return subjectUser;
    }

    public void setSubjectUser(User subjectUser) {
        this.subjectUser = subjectUser;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public AllocationModel getAllocationModel() {
        return allocationModel;
    }

    public void setAllocationModel(AllocationModel allocationModel) {
        this.allocationModel = allocationModel;
    }

    public Instant getValidationDeadline() {
        return validationDeadline;
    }

    public void setValidationDeadline(Instant validationDeadline) {
        this.validationDeadline = validationDeadline;
    }

    public Instant getValidatedAt() {
        return validatedAt;
    }

    public void setValidatedAt(Instant validatedAt) {
        this.validatedAt = validatedAt;
    }

    public Instant getCollectionStartAt() {
        return collectionStartAt;
    }

    public void setCollectionStartAt(Instant collectionStartAt) {
        this.collectionStartAt = collectionStartAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public UUID getClosedBy() {
        return closedBy;
    }

    public void setClosedBy(UUID closedBy) {
        this.closedBy = closedBy;
    }

    public Instant getSubmittedForCalibrationAt() {
        return submittedForCalibrationAt;
    }

    public void setSubmittedForCalibrationAt(Instant submittedForCalibrationAt) {
        this.submittedForCalibrationAt = submittedForCalibrationAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
