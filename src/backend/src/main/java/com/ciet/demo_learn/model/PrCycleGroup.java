package com.ciet.demo_learn.model;

import com.ciet.demo_learn.enums.PrCycleGroupStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "pr_cycle_group")
public class PrCycleGroup extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id")
    private Cycle cycle;

    @Column(name = "group_label", nullable = false)
    private String groupLabel;

    @Column(name = "quarter", nullable = false)
    private Integer quarter;

    @Column(name = "blackout_start_at")
    private Instant blackoutStartAt;

    @Column(name = "blackout_end_at")
    private Instant blackoutEndAt;

    @Column(name = "start_at")
    private Instant startAt;

    @Column(name = "end_at")
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PrCycleGroupStatus status;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public Cycle getCycle() {
        return cycle;
    }

    public void setCycle(Cycle cycle) {
        this.cycle = cycle;
    }

    public String getGroupLabel() {
        return groupLabel;
    }

    public void setGroupLabel(String groupLabel) {
        this.groupLabel = groupLabel;
    }

    public Integer getQuarter() {
        return quarter;
    }

    public void setQuarter(Integer quarter) {
        this.quarter = quarter;
    }

    public Instant getBlackoutStartAt() {
        return blackoutStartAt;
    }

    public void setBlackoutStartAt(Instant blackoutStartAt) {
        this.blackoutStartAt = blackoutStartAt;
    }

    public Instant getBlackoutEndAt() {
        return blackoutEndAt;
    }

    public void setBlackoutEndAt(Instant blackoutEndAt) {
        this.blackoutEndAt = blackoutEndAt;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public void setStartAt(Instant startAt) {
        this.startAt = startAt;
    }

    public Instant getEndAt() {
        return endAt;
    }

    public void setEndAt(Instant endAt) {
        this.endAt = endAt;
    }

    public PrCycleGroupStatus getStatus() {
        return status;
    }

    public void setStatus(PrCycleGroupStatus status) {
        this.status = status;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
