package com.ciet.demo_learn.enums;

public enum CycleSubjectStatus {

    PENDING("Pending"),
    COLLECTING("Collecting"),
    READY_FOR_CALIBRATION("Ready for Calibration"),
    CALIBRATED("Calibrated"),
    DEBRIEFED("Debriefed");

    public final String description;

    CycleSubjectStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
