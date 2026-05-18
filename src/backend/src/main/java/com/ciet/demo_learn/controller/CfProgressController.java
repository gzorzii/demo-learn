package com.ciet.demo_learn.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.CfProgressDto;
import com.ciet.demo_learn.dto.PdmCfProgressDto;
import com.ciet.demo_learn.service.CfProgressService;

@RestController
public class CfProgressController {

    private final CfProgressService cfProgressService;

    public CfProgressController(CfProgressService cfProgressService) {
        this.cfProgressService = cfProgressService;
    }

    @GetMapping("/api/me/ciclos/cf/{cycleSubjectId}/progresso")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<CfProgressDto> getColaboradorProgress(
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfProgressService.getForSubject(cycleSubjectId, user.id()));
    }

    @GetMapping("/api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/progresso")
    @PreAuthorize("hasAuthority('PDM')")
    public ResponseEntity<PdmCfProgressDto> getPdmProgress(
            @PathVariable UUID colaboradorId,
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfProgressService.getForPdm(colaboradorId, cycleSubjectId, user.id()));
    }
}
