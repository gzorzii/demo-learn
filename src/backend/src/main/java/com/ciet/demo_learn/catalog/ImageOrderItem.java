package com.ciet.demo_learn.catalog;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.UUID;

public record ImageOrderItem(
        @NotNull UUID imageId,
        @NotNull @PositiveOrZero Integer order
) {}
