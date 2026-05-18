package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.UUID;

public record EvaluationContextDto(
        String subjectName,
        UUID cycleSubjectId,
        Instant collectionDeadline,
        EvaluationState evaluationState,
        Instant alreadySubmittedAt,
        String draftText
) {}
