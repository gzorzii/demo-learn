package com.ciet.demo_learn.enums;

public enum EvaluatorStatus {

    PENDING("Pending"),
    RESPONDED("Responded"),
    SKIPPED("Skipped");

    public final String description;

    EvaluatorStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
