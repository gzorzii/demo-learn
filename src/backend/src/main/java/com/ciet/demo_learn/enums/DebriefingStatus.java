package com.ciet.demo_learn.enums;

public enum DebriefingStatus {

    PENDING("Pending"),
    SCHEDULED("Scheduled"),
    CONDUCTED("Conducted");

    public final String descrition;

    DebriefingStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
