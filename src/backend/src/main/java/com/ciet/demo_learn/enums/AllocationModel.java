package com.ciet.demo_learn.enums;

public enum AllocationModel {

    TEAM("Team"),
    STAFF_AUG("Staff Augmentation"),
    SDLC("SDLC");

    public final String description;

    AllocationModel(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
