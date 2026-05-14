package com.ciet.demo_learn.enums;

public enum PrCycleGroupStatus {

    SCHEDULED("Scheduled"),
    ACTIVE("Active"),
    CLOSED("Closed");

    public final String descrition;

    PrCycleGroupStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
