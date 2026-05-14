package com.ciet.demo_learn.enums;

public enum DebriefingStatus {

    PENDING("Pending"),
    SCHEDULED("Scheduled"),
    CONDUCTED("Conducted");

    public final String description;

    DebriefingStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
