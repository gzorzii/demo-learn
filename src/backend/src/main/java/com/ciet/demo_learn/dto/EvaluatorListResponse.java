package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EvaluatorListResponse(
        UUID cycleSubjectId,
        Instant validationDeadline,
        Instant validatedAt,
        List<EvaluatorItemDto> evaluators,
        int guestCount,
        int guestLimit
) {}
