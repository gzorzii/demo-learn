package com.ciet.demo_learn.enums;

public enum AiSummaryStatus {

    PENDING_APPROVAL("Pending Approval"),
    APPROVED("Approved"),
    REJECTED("Rejected");

    public final String description;

    AiSummaryStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
