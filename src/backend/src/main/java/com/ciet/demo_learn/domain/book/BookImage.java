package com.ciet.demo_learn.domain.book;

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
@Table(name = "book_image")
public class BookImage extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "url")
    private String url;

    @Column(name = "sort_order")
    private short sortOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id")
    private Book book;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public short getSortOrder() { return sortOrder; }
    public void setSortOrder(short sortOrder) { this.sortOrder = sortOrder; }

    public Book getBook() { return book; }
    public void setBook(Book book) { this.book = book; }
}
