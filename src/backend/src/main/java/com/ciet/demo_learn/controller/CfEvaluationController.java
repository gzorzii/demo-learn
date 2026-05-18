package com.ciet.demo_learn.controller;

import java.util.List;
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
import com.ciet.demo_learn.dto.EvaluationContextDto;
import com.ciet.demo_learn.dto.PendingEvaluationItemDto;
import com.ciet.demo_learn.dto.SaveDraftRequest;
import com.ciet.demo_learn.dto.SubmitEvaluationRequest;
import com.ciet.demo_learn.service.CfGuestEvaluationService;

@RestController
@RequestMapping("/api/me/avaliacoes/cf")
public class CfEvaluationController {

    private final CfGuestEvaluationService cfGuestEvaluationService;

    public CfEvaluationController(CfGuestEvaluationService cfGuestEvaluationService) {
        this.cfGuestEvaluationService = cfGuestEvaluationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<List<PendingEvaluationItemDto>> listPending(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfGuestEvaluationService.listPendingEvaluations(user.id()));
    }

    @GetMapping("/{cycleEvaluatorId}")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<EvaluationContextDto> getContext(
            @PathVariable UUID cycleEvaluatorId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfGuestEvaluationService.getEvaluationContext(cycleEvaluatorId, user.id()));
    }

    @PutMapping("/{cycleEvaluatorId}/rascunho")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> saveDraft(
            @PathVariable UUID cycleEvaluatorId,
            @RequestBody @Valid SaveDraftRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cfGuestEvaluationService.saveDraft(cycleEvaluatorId, user.id(), request.draftText());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{cycleEvaluatorId}")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> submit(
            @PathVariable UUID cycleEvaluatorId,
            @RequestBody @Valid SubmitEvaluationRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cfGuestEvaluationService.submitEvaluation(cycleEvaluatorId, user.id(), request.responseText());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
