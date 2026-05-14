package com.ciet.demo_learn.enums;

public enum PrCycleGroupStatus {

    SCHEDULED("Scheduled"),
    ACTIVE("Active"),
    CLOSED("Closed");

    public final String description;

    PrCycleGroupStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
