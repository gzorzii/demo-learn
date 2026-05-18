package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.UUID;

public record CfProgressDto(
        UUID cycleSubjectId,
        String cycleStatus,
        String selfEvaluationStatus,
        String pdmEvaluationStatus,
        int guestTotal,
        int guestResponded,
        Instant collectionDeadline,
        Integer daysRemaining,
        String initiatedBy
) {}
