package com.ciet.demo_learn.exception;

import com.ciet.demo_learn.dto.CfConflictResponse;
import com.ciet.demo_learn.dto.EvaluationConflictResponse;
import com.ciet.demo_learn.dto.NotFoundResponse;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
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

    @ExceptionHandler(EvaluationConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public EvaluationConflictResponse handleEvaluationConflict(EvaluationConflictException ex) {
        return new EvaluationConflictResponse(ex.getErrorCode());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public NotFoundResponse handleResourceNotFound(ResourceNotFoundException ex) {
        return new NotFoundResponse(ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public NotFoundResponse handleAccessDenied(AccessDeniedException ex) {
        return new NotFoundResponse(ex.getMessage());
    }
}
