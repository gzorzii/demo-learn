package com.ciet.demo_learn.enums;

public enum PrAssessmentStatus {

    DRAFT("Draft"),
    SUBMITTED("Submitted");

    public final String descrition;

    PrAssessmentStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
