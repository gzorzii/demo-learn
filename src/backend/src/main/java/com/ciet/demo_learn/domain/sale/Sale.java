package com.ciet.demo_learn.domain.sale;

import com.ciet.demo_learn.domain.branch.Branch;
import com.ciet.demo_learn.domain.user.User;
import com.ciet.demo_learn.domain.voucher.Voucher;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "sale")
public class Sale extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "voucher_amount", precision = 10, scale = 2)
    private BigDecimal voucherAmount;

    @Column(name = "receipt_printed")
    private boolean receiptPrinted;

    @Column(name = "sold_at")
    private OffsetDateTime soldAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id")
    private User cashier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SaleItem> items;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SalePayment> payments;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getVoucherAmount() { return voucherAmount; }
    public void setVoucherAmount(BigDecimal voucherAmount) { this.voucherAmount = voucherAmount; }

    public boolean isReceiptPrinted() { return receiptPrinted; }
    public void setReceiptPrinted(boolean receiptPrinted) { this.receiptPrinted = receiptPrinted; }

    public OffsetDateTime getSoldAt() { return soldAt; }
    public void setSoldAt(OffsetDateTime soldAt) { this.soldAt = soldAt; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public User getCashier() { return cashier; }
    public void setCashier(User cashier) { this.cashier = cashier; }

    public Voucher getVoucher() { return voucher; }
    public void setVoucher(Voucher voucher) { this.voucher = voucher; }

    public List<SaleItem> getItems() { return items; }
    public void setItems(List<SaleItem> items) { this.items = items; }

    public List<SalePayment> getPayments() { return payments; }
    public void setPayments(List<SalePayment> payments) { this.payments = payments; }
}
