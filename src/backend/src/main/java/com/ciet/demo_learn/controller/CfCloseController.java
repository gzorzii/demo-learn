package com.ciet.demo_learn.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.service.CfCloseService;

@RestController
public class CfCloseController {

    private final CfCloseService cfCloseService;

    public CfCloseController(CfCloseService cfCloseService) {
        this.cfCloseService = cfCloseService;
    }

    @PostMapping("/api/me/ciclos/cf/{cycleSubjectId}/encerrar")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void closeCycle(
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cfCloseService.closeCycle(cycleSubjectId, user.id());
    }
}