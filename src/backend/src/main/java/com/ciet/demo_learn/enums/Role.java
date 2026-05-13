package com.ciet.demo_learn.enums;

public enum Role {

    DEVELOPER("Developer");

    public final String descrition;

    Role(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
