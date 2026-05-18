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
import com.ciet.demo_learn.dto.SelfEvaluationContextDto;
import com.ciet.demo_learn.dto.SelfEvaluationDraftRequest;
import com.ciet.demo_learn.dto.SelfEvaluationSubmitRequest;
import com.ciet.demo_learn.service.CfSelfEvaluationService;

@RestController
@RequestMapping("/api/me/ciclos/cf")
public class CfSelfEvaluationController {

    private final CfSelfEvaluationService cfSelfEvaluationService;

    public CfSelfEvaluationController(CfSelfEvaluationService cfSelfEvaluationService) {
        this.cfSelfEvaluationService = cfSelfEvaluationService;
    }

    @GetMapping("/{cycleSubjectId}/autoavaliacao")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<SelfEvaluationContextDto> getContext(
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(cfSelfEvaluationService.getContext(cycleSubjectId, user.id()));
    }

    @PutMapping("/{cycleSubjectId}/autoavaliacao/rascunho")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> saveDraft(
            @PathVariable UUID cycleSubjectId,
            @RequestBody @Valid SelfEvaluationDraftRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cfSelfEvaluationService.saveDraft(cycleSubjectId, user.id(), request.draftText());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{cycleSubjectId}/autoavaliacao/submit")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> submit(
            @PathVariable UUID cycleSubjectId,
            @RequestBody @Valid SelfEvaluationSubmitRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cfSelfEvaluationService.submit(cycleSubjectId, user.id(), request.responseText());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
