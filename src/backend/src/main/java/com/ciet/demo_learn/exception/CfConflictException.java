package com.ciet.demo_learn.exception;

public class CfConflictException extends RuntimeException {

    private final String errorCode;

    public CfConflictException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
