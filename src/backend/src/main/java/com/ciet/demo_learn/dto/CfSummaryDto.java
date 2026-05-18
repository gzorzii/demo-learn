package com.ciet.demo_learn.dto;

import java.util.List;
import java.util.UUID;

public record CfSummaryDto(
        UUID cycleSubjectId,
        String cycleStatus,
        SelfEvaluationSummaryDto selfEvaluation,
        PdmEvaluationSummaryDto pdmEvaluation,
        Integer guestRespondentCount,
        List<String> guestResponses,
        Boolean guestMinimumNotReached,
        String aiSummary
) {}