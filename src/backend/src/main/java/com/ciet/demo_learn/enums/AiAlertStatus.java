package com.ciet.demo_learn.enums;

public enum AiAlertStatus {

    OPEN("Open"),
    DISMISSED("Dismissed"),
    RESOLVED("Resolved");

    public final String descrition;

    AiAlertStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
