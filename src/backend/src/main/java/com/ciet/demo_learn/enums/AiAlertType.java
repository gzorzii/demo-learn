package com.ciet.demo_learn.enums;

public enum AiAlertType {

    INSUFFICIENT_DETAIL("Insufficient Detail"),
    LOW_DIMENSION_COVERAGE("Low Dimension Coverage"),
    INCOHERENCE("Incoherence");

    public final String description;

    AiAlertType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
