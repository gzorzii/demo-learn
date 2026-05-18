package com.ciet.demo_learn.dto;

import java.util.UUID;

public record ActiveCycleSummaryDto(String cycleType, String cycleStatus, UUID cycleSubjectId) {}
