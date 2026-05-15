package com.ciet.demo_learn.exception;

import com.ciet.demo_learn.dto.CfConflictResponse;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CfConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public CfConflictResponse handleCfConflict(CfConflictException ex) {
        return new CfConflictResponse(ex.getErrorCode(), ex.getBlackoutEndsAt());
    }
}
