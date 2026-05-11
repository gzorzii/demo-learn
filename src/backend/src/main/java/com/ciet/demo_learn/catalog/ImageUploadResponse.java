package com.ciet.demo_learn.catalog;

import java.util.UUID;

public record ImageUploadResponse(UUID id, String url, Integer order) {}
