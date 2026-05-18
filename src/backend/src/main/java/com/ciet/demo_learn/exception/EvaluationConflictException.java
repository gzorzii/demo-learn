package com.ciet.demo_learn.exception;

public class EvaluationConflictException extends RuntimeException {

    private final String errorCode;

    public EvaluationConflictException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
