package com.ciet.demo_learn.catalog;

public record IsbnPrefillResponse(
        String title,
        String author,
        String publisher,
        Integer year,
        String category
) {}
