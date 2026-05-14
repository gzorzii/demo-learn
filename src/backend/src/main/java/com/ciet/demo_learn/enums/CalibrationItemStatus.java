package com.ciet.demo_learn.enums;

public enum CalibrationItemStatus {

    PENDING("Pending"),
    DRAFT("Draft"),
    CONFIRMED("Confirmed");

    public final String description;

    CalibrationItemStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
