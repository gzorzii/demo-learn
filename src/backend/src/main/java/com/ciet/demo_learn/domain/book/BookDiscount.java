package com.ciet.demo_learn.domain.book;

import com.ciet.demo_learn.domain.discount.Discount;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "book_discount")
public class BookDiscount extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "applied_at")
    private OffsetDateTime appliedAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id")
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discount_id")
    private Discount discount;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public OffsetDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(OffsetDateTime appliedAt) { this.appliedAt = appliedAt; }

    public Book getBook() { return book; }
    public void setBook(Book book) { this.book = book; }

    public Discount getDiscount() { return discount; }
    public void setDiscount(Discount discount) { this.discount = discount; }
}
