package com.ciet.demo_learn.enums;

public enum AiAlertStatus {

    OPEN("Open"),
    DISMISSED("Dismissed"),
    RESOLVED("Resolved");

    public final String description;

    AiAlertStatus(String description) {
        this.description = description;
    }

    public String getDescrition() {
        return description;
    }
}
