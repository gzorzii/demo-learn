package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotBlank;

public record PdmEvaluationSubmitRequest(
        @NotBlank String resultado,
        @NotBlank String prontidao,
        @NotBlank String action
) {}
