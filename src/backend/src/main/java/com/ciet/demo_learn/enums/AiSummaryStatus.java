package com.ciet.demo_learn.enums;

public enum AiSummaryStatus {

    PENDING_APPROVAL("Pending Approval"),
    APPROVED("Approved"),
    REJECTED("Rejected");

    public final String descrition;

    AiSummaryStatus(String descrition) {
        this.descrition = descrition;
    }

    public String getDescrition() {
        return descrition;
    }
}
