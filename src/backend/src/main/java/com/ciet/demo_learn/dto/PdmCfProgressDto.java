package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PdmCfProgressDto(
        UUID cycleSubjectId,
        String cycleStatus,
        String selfEvaluationStatus,
        String pdmEvaluationStatus,
        int guestTotal,
        int guestResponded,
        Instant collectionDeadline,
        Integer daysRemaining,
        List<GuestEvaluatorStatusDto> guestEvaluators,
        String initiatedBy
) {}
