package com.ciet.demo_learn.dto;

import java.util.List;

public record MenuItemDto(
        String key,
        String label,
        String route,
        List<String> roles
) {}
