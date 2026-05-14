package com.ciet.demo_learn.dto;

import java.util.List;
import java.util.UUID;

public record AuthenticatedUser(
        UUID id,
        String name,
        String email,
        List<String> roles,
        String picture
) {}