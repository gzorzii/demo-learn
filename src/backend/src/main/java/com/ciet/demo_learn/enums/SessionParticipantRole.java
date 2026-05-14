package com.ciet.demo_learn.enums;

public enum SessionParticipantRole {

    PDM("PDM"),
    CALIBRADOR("Calibrador"),
    BP("Business Partner"),
    GOVERNANCA("Governança");

    public final String descrition;

    SessionParticipantRole(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
