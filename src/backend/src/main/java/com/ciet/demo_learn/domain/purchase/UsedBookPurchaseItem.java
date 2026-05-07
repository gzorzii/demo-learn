package com.ciet.demo_learn.domain.purchase;

import com.ciet.demo_learn.domain.book.Book;
import com.ciet.demo_learn.shared.audit.Auditable;
import com.ciet.demo_learn.shared.uuid.UuidV7;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "used_book_purchase_item")
public class UsedBookPurchaseItem extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id")
    private UsedBookPurchase purchase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id")
    private Book book;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UsedBookPurchase getPurchase() { return purchase; }
    public void setPurchase(UsedBookPurchase purchase) { this.purchase = purchase; }

    public Book getBook() { return book; }
    public void setBook(Book book) { this.book = book; }
}
