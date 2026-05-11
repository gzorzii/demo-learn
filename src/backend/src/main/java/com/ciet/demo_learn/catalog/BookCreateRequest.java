package com.ciet.demo_learn.catalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record BookCreateRequest(
        @NotBlank @Size(max = 500)  String title,
        @NotBlank @Size(max = 300)  String author,
        @NotBlank                   String isbn,
        @Size(max = 300)            String publisher,
                                    Integer year,
        @NotBlank @Size(max = 150)  String category,
        @NotBlank                   String condition,
        @Size(max = 1000)           String conditionDescription,
        @NotNull @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal salePrice,
                                    Integer quantity,
        @Size(max = 100)            String shelfLocation,
        @Size(max = 2000)           String description,
                                    UUID lotId
) {}
