package com.ciet.demo_learn.enums;

public enum PrAssessmentStatus {

    DRAFT("Draft"),
    SUBMITTED("Submitted");

    public final String description;

    PrAssessmentStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
