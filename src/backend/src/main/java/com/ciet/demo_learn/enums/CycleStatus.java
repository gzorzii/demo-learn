package com.ciet.demo_learn.enums;

public enum CycleStatus {

    DRAFT("Draft"),
    VALIDATING_EVALUATORS("Validating Evaluators"),
    COLLECTING("Collecting"),
    CLOSED("Closed"),
    CANCELLED("Cancelled");

    public final String descrition;

    CycleStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
