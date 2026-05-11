package com.ciet.demo_learn.catalog;

import java.util.List;

public record BookPageResponse(
        List<BookSummaryResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
