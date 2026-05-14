package com.ciet.demo_learn.enums;

public enum AllocationModel {

    TEAM("Team"),
    STAFF_AUG("Staff Augmentation"),
    SDLC("SDLC");

    public final String descrition;

    AllocationModel(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
