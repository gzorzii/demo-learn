package com.ciet.demo_learn.enums;

public enum CalibrationItemStatus {

    PENDING("Pending"),
    DRAFT("Draft"),
    CONFIRMED("Confirmed");

    public final String descrition;

    CalibrationItemStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
