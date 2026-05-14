package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.CycleStatus;
import com.ciet.demo_learn.enums.CycleType;
import com.ciet.demo_learn.enums.TriggerType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "cycle")
public class Cycle extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "cycle_type", nullable = false)
    private CycleType cycleType;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CycleStatus status;

    @Column(name = "name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type")
    private TriggerType triggerType;

    @Column(name = "quarter")
    private Integer quarter;

    @Column(name = "is_blackout")
    private Boolean isBlackout;

    @Column(name = "validation_deadline")
    private Instant validationDeadline;

    @Column(name = "collection_start_at")
    private Instant collectionStartAt;

    @Column(name = "collection_deadline")
    private Instant collectionDeadline;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public CycleType getCycleType() {
        return cycleType;
    }

    public void setCycleType(CycleType cycleType) {
        this.cycleType = cycleType;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public CycleStatus getStatus() {
        return status;
    }

    public void setStatus(CycleStatus status) {
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public TriggerType getTriggerType() {
        return triggerType;
    }

    public void setTriggerType(TriggerType triggerType) {
        this.triggerType = triggerType;
    }

    public Integer getQuarter() {
        return quarter;
    }

    public void setQuarter(Integer quarter) {
        this.quarter = quarter;
    }

    public Boolean getIsBlackout() {
        return isBlackout;
    }

    public void setIsBlackout(Boolean isBlackout) {
        this.isBlackout = isBlackout;
    }

    public Instant getValidationDeadline() {
        return validationDeadline;
    }

    public void setValidationDeadline(Instant validationDeadline) {
        this.validationDeadline = validationDeadline;
    }

    public Instant getCollectionStartAt() {
        return collectionStartAt;
    }

    public void setCollectionStartAt(Instant collectionStartAt) {
        this.collectionStartAt = collectionStartAt;
    }

    public Instant getCollectionDeadline() {
        return collectionDeadline;
    }

    public void setCollectionDeadline(Instant collectionDeadline) {
        this.collectionDeadline = collectionDeadline;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
