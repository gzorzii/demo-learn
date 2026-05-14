package com.ciet.demo_learn.enums;

public enum EvaluatorType {

    SELF("Self"),
    PDM("PDM"),
    PEER("Peer");

    public final String description;

    EvaluatorType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
