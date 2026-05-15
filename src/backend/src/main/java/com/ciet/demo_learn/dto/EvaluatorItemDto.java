package com.ciet.demo_learn.dto;

import java.util.UUID;

public record EvaluatorItemDto(
        UUID evaluatorId,
        UUID userId,
        String name,
        String email,
        String evaluatorType,
        boolean isMandatory,
        String source,
        UUID addedBy
) {}
