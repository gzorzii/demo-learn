package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotNull;

public record SelfEvaluationDraftRequest(
        @NotNull String draftText
) {}
