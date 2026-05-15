package com.ciet.demo_learn.exception;

import java.time.Instant;

public class CfConflictException extends RuntimeException {

    private final String errorCode;
    private final Instant blackoutEndsAt;

    public CfConflictException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
        this.blackoutEndsAt = null;
    }

    public CfConflictException(String errorCode, Instant blackoutEndsAt) {
        super(errorCode);
        this.errorCode = errorCode;
        this.blackoutEndsAt = blackoutEndsAt;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Instant getBlackoutEndsAt() {
        return blackoutEndsAt;
    }
}
