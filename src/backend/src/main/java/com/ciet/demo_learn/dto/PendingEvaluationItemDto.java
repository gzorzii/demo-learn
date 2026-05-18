package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.UUID;

public record PendingEvaluationItemDto(
        UUID cycleEvaluatorId,
        String subjectName,
        Instant collectionDeadline
) {}
