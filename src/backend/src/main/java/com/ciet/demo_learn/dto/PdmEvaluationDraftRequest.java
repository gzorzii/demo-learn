package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotNull;

public record PdmEvaluationDraftRequest(
        @NotNull String resultadoDraft,
        @NotNull String prontidaoDraft,
        @NotNull String actionDraft
) {}
