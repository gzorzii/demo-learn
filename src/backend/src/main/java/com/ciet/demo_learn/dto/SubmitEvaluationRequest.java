package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotBlank;

public record SubmitEvaluationRequest(@NotBlank String responseText) {}
