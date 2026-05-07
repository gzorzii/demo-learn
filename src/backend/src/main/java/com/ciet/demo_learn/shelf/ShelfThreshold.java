package com.ciet.demo_learn.shelf;

import com.ciet.demo_learn.branch.Branch;
import com.ciet.demo_learn.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import com.ciet.demo_learn.config.GenerateUuidV7;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shelf_threshold")
public class ShelfThreshold {

    @Id
    @GenerateUuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false, unique = true)
    private Branch branch;

    @Column(name = "days_threshold", nullable = false)
    private Integer daysThreshold;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configured_by", nullable = false)
    private User configuredBy;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Branch getBranch() {
        return branch;
    }

    public void setBranch(Branch branch) {
        this.branch = branch;
    }

    public Integer getDaysThreshold() {
        return daysThreshold;
    }

    public void setDaysThreshold(Integer daysThreshold) {
        this.daysThreshold = daysThreshold;
    }

    public User getConfiguredBy() {
        return configuredBy;
    }

    public void setConfiguredBy(User configuredBy) {
        this.configuredBy = configuredBy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
