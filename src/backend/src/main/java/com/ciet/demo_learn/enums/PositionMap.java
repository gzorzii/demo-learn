package com.ciet.demo_learn.enums;

public enum PositionMap {

    INTERN(1L, "Intern"),
    JUNIOR(2L, "Junior"),
    MID_LEVEL(3L, "Mid-Level"),
    SENIOR(4L, "Senior"),
    MANAGER(5L, "Master / Manager"),
    SENIOR_MANAGER(6L, "Master 2 / Senior Manager"),
    EXECUTIVE_MANAGER(7L, "Executive Manager"),
    EXECUTIVE_DIRECTOR(8L, "Executive Director"),
    PARTNER(9L, "Partner"),
    CEO(10L, "CEO");

    private final Long value;
    private final String description;

    PositionMap(Long value, String description) {
        this.value = value;
        this.description = description;
    }

    public Long getValue() {
        return value;
    }

    public String getDescription() {
        return description;
    }
}
