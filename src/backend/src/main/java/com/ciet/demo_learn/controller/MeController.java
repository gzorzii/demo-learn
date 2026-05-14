package com.ciet.demo_learn.controller;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.MenuResponse;
import com.ciet.demo_learn.service.MeService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final MeService meService;

    public MeController(MeService meService) {
        this.meService = meService;
    }

    @GetMapping
    public AuthenticatedUser me(@AuthenticationPrincipal AuthenticatedUser user) {
        return user;
    }

    @GetMapping("/menu")
    public MenuResponse menu(@AuthenticationPrincipal AuthenticatedUser user) {
        return meService.getMenu(user);
    }
}
