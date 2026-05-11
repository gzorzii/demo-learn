package com.ciet.demo_learn.catalog;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String title,
        String author,
        String isbn,
        String publisher,
        Integer year,
        String category,
        String condition,
        String conditionDescription,
        BigDecimal salePrice,
        String description,
        String shelfLocation,
        UUID branchId,
        LocalDateTime registeredAt,
        Boolean active,
        Integer stockQuantity,
        List<ImageResponse> images
) {}
