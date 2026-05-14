package com.ciet.demo_learn.enums;

public enum CalibrationSessionStatus {

    SCHEDULED("Scheduled"),
    IN_PROGRESS("In Progress"),
    PAUSED("Paused"),
    CLOSED("Closed");

    public final String descrition;

    CalibrationSessionStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
