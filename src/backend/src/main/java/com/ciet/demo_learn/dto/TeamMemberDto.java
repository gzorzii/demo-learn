package com.ciet.demo_learn.dto;

import java.util.UUID;

public record TeamMemberDto(
        UUID userId,
        String name,
        String email,
        ActiveCycleSummaryDto activeCycle,
        EligibilityStatusDto eligibility
) {}
