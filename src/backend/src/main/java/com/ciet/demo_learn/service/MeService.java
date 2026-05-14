package com.ciet.demo_learn.service;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.MenuItemDto;
import com.ciet.demo_learn.dto.MenuResponse;
import com.ciet.demo_learn.enums.Permission;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class MeService {

    private static final List<MenuItemDto> MENU_CATALOG = List.of(
            new MenuItemDto("meus-ciclos", "Meus Ciclos", "/meus-ciclos", List.of("CIETER", "PDM", "ADMIN")),
            new MenuItemDto("meu-time", "My Team", "/meu-time", List.of("PDM", "ADMIN")),
            new MenuItemDto("calibracao", "Calibração", "/calibracao", List.of("CALIBRATOR", "BP", "ADMIN")),
            new MenuItemDto("admin", "Admin", "/admin", List.of("ADMIN"))
    );

    private static final Map<Permission, Set<String>> PERMISSION_ITEMS;

    static {
        PERMISSION_ITEMS = new EnumMap<>(Permission.class);
        PERMISSION_ITEMS.put(Permission.CIETER,     Set.of("meus-ciclos"));
        PERMISSION_ITEMS.put(Permission.PDM,        Set.of("meus-ciclos", "meu-time"));
        PERMISSION_ITEMS.put(Permission.CALIBRATOR, Set.of("calibracao"));
        PERMISSION_ITEMS.put(Permission.BP,         Set.of("calibracao"));
        PERMISSION_ITEMS.put(Permission.ADMIN,      Set.of("meus-ciclos", "meu-time", "calibracao", "admin"));
    }

    private static final List<Permission> ROUTE_PRIORITY = List.of(
            Permission.ADMIN, Permission.CALIBRATOR, Permission.BP, Permission.PDM, Permission.CIETER
    );

    private static final Map<Permission, String> DEFAULT_ROUTES;

    static {
        DEFAULT_ROUTES = new EnumMap<>(Permission.class);
        DEFAULT_ROUTES.put(Permission.CIETER,     "/meus-ciclos");
        DEFAULT_ROUTES.put(Permission.PDM,        "/meu-time");
        DEFAULT_ROUTES.put(Permission.CALIBRATOR, "/calibracao");
        DEFAULT_ROUTES.put(Permission.BP,         "/calibracao");
        DEFAULT_ROUTES.put(Permission.ADMIN,      "/admin");
    }

    public MenuResponse getMenu(AuthenticatedUser user) {
        Set<Permission> permissions = parsePermissions(user.roles());
        if (permissions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        Set<String> allowedKeys = permissions.stream()
                .flatMap(p -> PERMISSION_ITEMS.get(p).stream())
                .collect(Collectors.toSet());

        List<MenuItemDto> items = MENU_CATALOG.stream()
                .filter(item -> allowedKeys.contains(item.key()))
                .toList();

        String defaultRoute = ROUTE_PRIORITY.stream()
                .filter(permissions::contains)
                .findFirst()
                .map(DEFAULT_ROUTES::get)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));

        return new MenuResponse(user, defaultRoute, items);
    }

    private Set<Permission> parsePermissions(List<String> roles) {
        return roles.stream()
                .flatMap(role -> {
                    try {
                        return Stream.of(Permission.valueOf(role));
                    } catch (IllegalArgumentException e) {
                        return Stream.empty();
                    }
                })
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(Permission.class)));
    }
}
