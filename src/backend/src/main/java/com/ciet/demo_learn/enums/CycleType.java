package com.ciet.demo_learn.enums;

public enum CycleType {

    CF("Continuous Feedback"),
    PR("Performance Review");

    public final String descrition;

    CycleType(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
