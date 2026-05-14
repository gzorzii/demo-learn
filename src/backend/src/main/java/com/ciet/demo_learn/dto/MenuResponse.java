package com.ciet.demo_learn.dto;

import java.util.List;

public record MenuResponse(
        AuthenticatedUser user,
        String defaultRoute,
        List<MenuItemDto> menuItems
) {}
