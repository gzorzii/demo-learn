package com.ciet.demo_learn.catalog;

import java.math.BigDecimal;
import java.util.UUID;

public record BookSummaryResponse(
        UUID id,
        String title,
        String author,
        String category,
        String condition,
        BigDecimal salePrice,
        Integer stockQuantity,
        String shelfLocation
) {}
