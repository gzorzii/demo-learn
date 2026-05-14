package com.ciet.demo_learn.dto;

import java.util.UUID;

public record ActiveCycleDto(
        UUID cycleSubjectId,
        UUID cycleId,
        String cycleType,
        String cycleName,
        String currentPhase,
        String collectionDeadline,
        Integer daysRemaining,
        double responseRate,
        int totalEvaluators,
        int respondedEvaluators
) {}
