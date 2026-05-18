package com.ciet.demo_learn.dto;

import java.util.List;
import java.util.UUID;

public record PdmCfSummaryDto(
        UUID cycleSubjectId,
        String cycleStatus,
        SelfEvaluationSummaryDto selfEvaluation,
        PdmEvaluationSummaryDto pdmEvaluation,
        Integer guestRespondentCount,
        List<GuestEvaluationDetailDto> guestEvaluations,
        String aiSummary
) {}