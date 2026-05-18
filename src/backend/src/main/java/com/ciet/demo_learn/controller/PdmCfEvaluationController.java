package com.ciet.demo_learn.controller;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.PdmEvaluationContextDto;
import com.ciet.demo_learn.dto.PdmEvaluationDraftRequest;
import com.ciet.demo_learn.dto.PdmEvaluationSubmitRequest;
import com.ciet.demo_learn.service.PdmCfEvaluationService;

@RestController
@RequestMapping("/api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/pdm-evaluation")
public class PdmCfEvaluationController {

    private final PdmCfEvaluationService service;

    public PdmCfEvaluationController(PdmCfEvaluationService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PDM')")
    public ResponseEntity<PdmEvaluationContextDto> getContext(
            @PathVariable UUID colaboradorId,
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(service.getContext(cycleSubjectId, colaboradorId, user.id()));
    }

    @PutMapping("/draft")
    @PreAuthorize("hasAuthority('PDM')")
    public ResponseEntity<Void> saveDraft(
            @PathVariable UUID colaboradorId,
            @PathVariable UUID cycleSubjectId,
            @RequestBody @Valid PdmEvaluationDraftRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        service.saveDraft(cycleSubjectId, colaboradorId, user.id(),
                request.resultadoDraft(), request.prontidaoDraft(), request.actionDraft());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/submit")
    @PreAuthorize("hasAuthority('PDM')")
    public ResponseEntity<Void> submit(
            @PathVariable UUID colaboradorId,
            @PathVariable UUID cycleSubjectId,
            @RequestBody @Valid PdmEvaluationSubmitRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        service.submit(cycleSubjectId, colaboradorId, user.id(),
                request.resultado(), request.prontidao(), request.action());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
