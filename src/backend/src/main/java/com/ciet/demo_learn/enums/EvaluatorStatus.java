package com.ciet.demo_learn.enums;

public enum EvaluatorStatus {

    PENDING("Pending"),
    RESPONDED("Responded"),
    SKIPPED("Skipped");

    public final String descrition;

    EvaluatorStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
