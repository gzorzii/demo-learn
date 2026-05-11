package com.ciet.demo_learn.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ImageReorderRequest(
        @NotNull @NotEmpty @Valid List<ImageOrderItem> order
) {}
