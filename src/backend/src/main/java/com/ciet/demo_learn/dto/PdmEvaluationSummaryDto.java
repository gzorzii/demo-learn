package com.ciet.demo_learn.dto;

import java.time.Instant;

public record PdmEvaluationSummaryDto(String resultado, String prontidao, String action, Instant submittedAt) {}