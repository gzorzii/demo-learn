package com.ciet.demo_learn.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "permission")
public class Permission extends BaseEntity {

    @Column(name = "description", nullable = false, unique = true)
    private String description;

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
