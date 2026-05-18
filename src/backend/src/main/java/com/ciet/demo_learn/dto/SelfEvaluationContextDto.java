package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.UUID;

public record SelfEvaluationContextDto(
        String subjectName,
        UUID cycleSubjectId,
        String collectionDeadline,
        EvaluationState evaluationState,
        String submittedText,
        Instant submittedAt,
        String draftText
) {}
