package com.ciet.demo_learn.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveDraftRequest(@NotBlank String draftText) {}
