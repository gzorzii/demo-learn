package com.ciet.demo_learn.dto;

import java.time.Instant;
import java.util.UUID;

public record PdmEvaluationContextDto(
        UUID cycleEvaluatorId,
        UUID cycleSubjectId,
        String subjectName,
        Instant collectionDeadline,
        String evaluatorStatus,
        EvaluationState evaluationState,
        PdmDraftDto draft,
        PdmResponseDto response
) {}
