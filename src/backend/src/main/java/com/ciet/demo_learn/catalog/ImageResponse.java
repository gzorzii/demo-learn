package com.ciet.demo_learn.catalog;

import java.util.UUID;

public record ImageResponse(UUID id, String url, Integer order) {}
