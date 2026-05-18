package com.ciet.demo_learn.dto;

import java.time.Instant;

public record PdmResponseDto(String resultado, String prontidao, String action, Instant submittedAt) {}
