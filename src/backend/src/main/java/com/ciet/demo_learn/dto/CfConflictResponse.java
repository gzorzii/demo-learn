package com.ciet.demo_learn.dto;

import java.time.Instant;

public record CfConflictResponse(String errorCode, Instant blackoutEndsAt) {

    public CfConflictResponse(String errorCode) {
        this(errorCode, null);
    }
}
