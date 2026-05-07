package com.ciet.demo_learn.domain.discount;

import com.ciet.demo_learn.domain.branch.Branch;
import com.ciet.demo_learn.domain.user.User;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "discount")
public class Discount extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope")
    private DiscountScope scope;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType;

    @Column(name = "value", precision = 10, scale = 2)
    private BigDecimal value;

    @Column(name = "scope_book_id")
    private UUID scopeBookId;

    @Column(name = "scope_category")
    private String scopeCategory;

    @Column(name = "scope_author")
    private String scopeAuthor;

    @Column(name = "scope_price_min", precision = 10, scale = 2)
    private BigDecimal scopePriceMin;

    @Column(name = "scope_price_max", precision = 10, scale = 2)
    private BigDecimal scopePriceMax;

    @Column(name = "starts_at")
    private OffsetDateTime startsAt;

    @Column(name = "ends_at")
    private OffsetDateTime endsAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public DiscountScope getScope() { return scope; }
    public void setScope(DiscountScope scope) { this.scope = scope; }

    public DiscountType getDiscountType() { return discountType; }
    public void setDiscountType(DiscountType discountType) { this.discountType = discountType; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }

    public UUID getScopeBookId() { return scopeBookId; }
    public void setScopeBookId(UUID scopeBookId) { this.scopeBookId = scopeBookId; }

    public String getScopeCategory() { return scopeCategory; }
    public void setScopeCategory(String scopeCategory) { this.scopeCategory = scopeCategory; }

    public String getScopeAuthor() { return scopeAuthor; }
    public void setScopeAuthor(String scopeAuthor) { this.scopeAuthor = scopeAuthor; }

    public BigDecimal getScopePriceMin() { return scopePriceMin; }
    public void setScopePriceMin(BigDecimal scopePriceMin) { this.scopePriceMin = scopePriceMin; }

    public BigDecimal getScopePriceMax() { return scopePriceMax; }
    public void setScopePriceMax(BigDecimal scopePriceMax) { this.scopePriceMax = scopePriceMax; }

    public OffsetDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(OffsetDateTime startsAt) { this.startsAt = startsAt; }

    public OffsetDateTime getEndsAt() { return endsAt; }
    public void setEndsAt(OffsetDateTime endsAt) { this.endsAt = endsAt; }

    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}
