package com.ciet.demo_learn.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.CfSummaryDto;
import com.ciet.demo_learn.dto.PdmCfSummaryDto;
import com.ciet.demo_learn.service.CfSummaryService;

@RestController
public class CfSummaryController {

    private final CfSummaryService cfSummaryService;

    public CfSummaryController(CfSummaryService cfSummaryService) {
        this.cfSummaryService = cfSummaryService;
    }

    @GetMapping("/api/me/ciclos/cf/{cycleSubjectId}/resumo")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<CfSummaryDto> getColaboradorSummary(
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfSummaryService.getForSubject(cycleSubjectId, user.id()));
    }

    @GetMapping("/api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/resumo")
    @PreAuthorize("hasAuthority('PDM')")
    public ResponseEntity<PdmCfSummaryDto> getPdmSummary(
            @PathVariable UUID colaboradorId,
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfSummaryService.getForPdm(colaboradorId, cycleSubjectId, user.id()));
    }
}