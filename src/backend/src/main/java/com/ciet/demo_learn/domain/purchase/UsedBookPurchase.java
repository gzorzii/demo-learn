package com.ciet.demo_learn.domain.purchase;

import com.ciet.demo_learn.domain.branch.Branch;
import com.ciet.demo_learn.domain.customer.Customer;
import com.ciet.demo_learn.domain.user.User;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "used_book_purchase")
public class UsedBookPurchase extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "total_value", precision = 10, scale = 2)
    private BigDecimal totalValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type")
    private PurchasePaymentType paymentType;

    @Column(name = "notes")
    private String notes;

    @Column(name = "purchased_at")
    private OffsetDateTime purchasedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UsedBookPurchaseItem> items;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }

    public PurchasePaymentType getPaymentType() { return paymentType; }
    public void setPaymentType(PurchasePaymentType paymentType) { this.paymentType = paymentType; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getPurchasedAt() { return purchasedAt; }
    public void setPurchasedAt(OffsetDateTime purchasedAt) { this.purchasedAt = purchasedAt; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public User getManager() { return manager; }
    public void setManager(User manager) { this.manager = manager; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public List<UsedBookPurchaseItem> getItems() { return items; }
    public void setItems(List<UsedBookPurchaseItem> items) { this.items = items; }
}
