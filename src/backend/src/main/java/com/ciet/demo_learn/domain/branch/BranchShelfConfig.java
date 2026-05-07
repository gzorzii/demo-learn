package com.ciet.demo_learn.domain.branch;

import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "branch_shelf_config")
public class BranchShelfConfig extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "overdue_threshold_days")
    private int overdueThresholdDays;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public int getOverdueThresholdDays() { return overdueThresholdDays; }
    public void setOverdueThresholdDays(int overdueThresholdDays) { this.overdueThresholdDays = overdueThresholdDays; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }
}
