package com.ciet.demo_learn.enums;

public enum CycleType {

    CF("Continuous Feedback"),
    PR("Performance Review");

    public final String description;

    CycleType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
