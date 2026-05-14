package com.ciet.demo_learn.enums;

public enum CycleStatus {

    DRAFT("Draft"),
    VALIDATING_EVALUATORS("Validating Evaluators"),
    COLLECTING("Collecting"),
    CLOSED("Closed"),
    CANCELLED("Cancelled");

    public final String description;

    CycleStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
