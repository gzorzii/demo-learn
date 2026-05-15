package com.ciet.demo_learn.dto;

import java.util.UUID;

public record UserSearchItemDto(UUID userId, String name, String email) {}
