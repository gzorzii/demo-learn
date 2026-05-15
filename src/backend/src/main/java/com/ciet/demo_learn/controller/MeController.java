package com.ciet.demo_learn.controller;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.MenuResponse;
import com.ciet.demo_learn.service.MeService;
import com.ciet.demo_learn.service.SelfCfService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final MeService meService;
    private final SelfCfService selfCfService;

    public MeController(MeService meService, SelfCfService selfCfService) {
        this.meService = meService;
        this.selfCfService = selfCfService;
    }

    @GetMapping
    public AuthenticatedUser me(@AuthenticationPrincipal AuthenticatedUser user) {
        return user;
    }

    @GetMapping("/menu")
    public MenuResponse menu(@AuthenticationPrincipal AuthenticatedUser user) {
        return meService.getMenu(user);
    }

    @PostMapping("/cycles/cf")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> startSelfCf(@AuthenticationPrincipal AuthenticatedUser user) {
        selfCfService.startSelfCf(user.id());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
