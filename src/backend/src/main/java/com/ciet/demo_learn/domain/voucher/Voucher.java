package com.ciet.demo_learn.domain.voucher;

import com.ciet.demo_learn.domain.branch.Branch;
import com.ciet.demo_learn.domain.customer.Customer;
import com.ciet.demo_learn.domain.user.User;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "voucher")
public class Voucher extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "original_value", precision = 10, scale = 2)
    private BigDecimal originalValue;

    @Column(name = "balance", precision = 10, scale = 2)
    private BigDecimal balance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by")
    private User issuedBy;

    @OneToMany(mappedBy = "voucher", fetch = FetchType.LAZY)
    private List<VoucherRedemption> redemptions;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public BigDecimal getOriginalValue() { return originalValue; }
    public void setOriginalValue(BigDecimal originalValue) { this.originalValue = originalValue; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public User getIssuedBy() { return issuedBy; }
    public void setIssuedBy(User issuedBy) { this.issuedBy = issuedBy; }

    public List<VoucherRedemption> getRedemptions() { return redemptions; }
    public void setRedemptions(List<VoucherRedemption> redemptions) { this.redemptions = redemptions; }
}
