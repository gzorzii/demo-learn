package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddEvaluatorRequest(@NotNull UUID userId) {}
