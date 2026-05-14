package com.ciet.demo_learn.controller;

import com.ciet.demo_learn.dto.ActiveCyclesResponse;
import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.service.CycleService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/cycles")
public class CycleController {

    private final CycleService cycleService;

    public CycleController(CycleService cycleService) {
        this.cycleService = cycleService;
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM', 'ADMIN')")
    public ActiveCyclesResponse getActive(@AuthenticationPrincipal AuthenticatedUser user) {
        return cycleService.getActiveCycles(user.id());
    }
}
