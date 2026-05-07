package com.ciet.demo_learn.discount;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class DiscountBookId implements Serializable {

    @Column(name = "discount_id", nullable = false)
    private UUID discountId;

    @Column(name = "book_id", nullable = false)
    private UUID bookId;

    public DiscountBookId() {}

    public DiscountBookId(UUID discountId, UUID bookId) {
        this.discountId = discountId;
        this.bookId = bookId;
    }

    public UUID getDiscountId() {
        return discountId;
    }

    public void setDiscountId(UUID discountId) {
        this.discountId = discountId;
    }

    public UUID getBookId() {
        return bookId;
    }

    public void setBookId(UUID bookId) {
        this.bookId = bookId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DiscountBookId that)) return false;
        return Objects.equals(discountId, that.discountId) && Objects.equals(bookId, that.bookId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(discountId, bookId);
    }
}
