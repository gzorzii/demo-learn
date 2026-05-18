package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotBlank;

public record SelfEvaluationSubmitRequest(
        @NotBlank String responseText
) {}
