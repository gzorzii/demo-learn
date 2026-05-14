package com.ciet.demo_learn.enums;

public enum EvaluatorType {

    SELF("Self"),
    PDM("PDM"),
    PEER("Peer");

    public final String descrition;

    EvaluatorType(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
