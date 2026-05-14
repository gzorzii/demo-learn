package com.ciet.demo_learn.enums;

public enum AiAlertType {

    INSUFFICIENT_DETAIL("Insufficient Detail"),
    LOW_DIMENSION_COVERAGE("Low Dimension Coverage"),
    INCOHERENCE("Incoherence");

    public final String descrition;

    AiAlertType(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
