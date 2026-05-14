package com.ciet.demo_learn.enums;

public enum CycleSubjectStatus {

    PENDING("Pending"),
    COLLECTING("Collecting"),
    READY_FOR_CALIBRATION("Ready for Calibration"),
    CALIBRATED("Calibrated"),
    DEBRIEFED("Debriefed");

    public final String descrition;

    CycleSubjectStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
