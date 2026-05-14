package com.ciet.demo_learn.enums;

public enum CalibrationSessionStatus {

    SCHEDULED("Scheduled"),
    IN_PROGRESS("In Progress"),
    PAUSED("Paused"),
    CLOSED("Closed");

    public final String description;

    CalibrationSessionStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
