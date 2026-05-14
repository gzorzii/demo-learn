package com.ciet.demo_learn.enums;

public enum TriggerType {

    QUARTERLY_AUTO("Quarterly Automatic"),
    EVENT("Event"),
    MANUAL_PDM("Manual PDM"),
    MANUAL_SUBJECT("Manual Subject");

    public final String description;

    TriggerType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
