package com.ciet.demo_learn.dto;

import java.time.Instant;

public record SelfEvaluationSummaryDto(String responseText, Instant submittedAt) {}