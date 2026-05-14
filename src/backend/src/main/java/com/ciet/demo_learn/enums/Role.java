package com.ciet.demo_learn.enums;

public enum Role {

    DEVELOPER("DEVELOPER");

    public final String description;

    Role(String descrition) {
        this.description = descrition;
    }

    public String getDescription() {
        return description;
    }
}
