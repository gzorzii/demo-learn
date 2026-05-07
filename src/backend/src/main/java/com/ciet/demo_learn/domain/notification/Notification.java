package com.ciet.demo_learn.domain.notification;

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

import java.util.UUID;

@Entity
@Table(name = "notification")
public class Notification extends Auditable {

    @Id
    @UuidV7
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private NotificationType type;

    @Column(name = "title")
    private String title;

    @Column(name = "body")
    private String body;

    @Column(name = "read")
    private boolean read;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public Branch getBranch() { return branch; }
    public void setBranch(Branch branch) { this.branch = branch; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
