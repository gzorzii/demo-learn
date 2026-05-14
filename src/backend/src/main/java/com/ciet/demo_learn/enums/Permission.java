package com.ciet.demo_learn.enums;

public enum Permission {

    CIETER("CI&TER"),
    PDM("PDM"),
    CALIBRATOR("CALIBRATOR"),
    BP("Business Partner"),
    ADMIN("ADMIN");

    private final String description;

    Permission(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
