package com.ciet.demo_learn.domain.voucher;

import com.ciet.demo_learn.domain.sale.Sale;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "voucher_redemption")
public class VoucherRedemption extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "amount_used", precision = 10, scale = 2)
    private BigDecimal amountUsed;

    @Column(name = "redeemed_at")
    private OffsetDateTime redeemedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public BigDecimal getAmountUsed() { return amountUsed; }
    public void setAmountUsed(BigDecimal amountUsed) { this.amountUsed = amountUsed; }

    public OffsetDateTime getRedeemedAt() { return redeemedAt; }
    public void setRedeemedAt(OffsetDateTime redeemedAt) { this.redeemedAt = redeemedAt; }

    public Voucher getVoucher() { return voucher; }
    public void setVoucher(Voucher voucher) { this.voucher = voucher; }

    public Sale getSale() { return sale; }
    public void setSale(Sale sale) { this.sale = sale; }
}
