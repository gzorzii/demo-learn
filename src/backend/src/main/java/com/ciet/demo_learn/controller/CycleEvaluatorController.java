package com.ciet.demo_learn.controller;

import com.ciet.demo_learn.dto.AddEvaluatorRequest;
import com.ciet.demo_learn.dto.AuthenticatedUser;
import com.ciet.demo_learn.dto.EvaluatorItemDto;
import com.ciet.demo_learn.dto.EvaluatorListResponse;
import com.ciet.demo_learn.service.CycleValidationService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class CycleEvaluatorController {

    private final CycleValidationService cycleValidationService;

    public CycleEvaluatorController(CycleValidationService cycleValidationService) {
        this.cycleValidationService = cycleValidationService;
    }

    @GetMapping("/api/me/cycles/{cycleSubjectId}/evaluators")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public EvaluatorListResponse getMyEvaluators(
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return cycleValidationService.getEvaluatorsForSubject(cycleSubjectId, user.id());
    }

    @PostMapping("/api/me/cycles/{cycleSubjectId}/evaluators")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<EvaluatorItemDto> addMyEvaluator(
            @PathVariable UUID cycleSubjectId,
            @Valid @RequestBody AddEvaluatorRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        EvaluatorItemDto created = cycleValidationService.addEvaluatorBySubject(cycleSubjectId, request.userId(), user.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/api/me/cycles/{cycleSubjectId}/evaluators/{evaluatorId}")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> removeMyEvaluator(
            @PathVariable UUID cycleSubjectId,
            @PathVariable UUID evaluatorId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cycleValidationService.removeEvaluator(cycleSubjectId, evaluatorId, user.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/me/cycles/{cycleSubjectId}/evaluators/confirm")
    @PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")
    public ResponseEntity<Void> confirmMyEvaluators(
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        cycleValidationService.confirmEvaluators(cycleSubjectId, user.id());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/my-team/{subjectUserId}/cycles/{cycleSubjectId}/evaluators")
    @PreAuthorize("hasAuthority('PDM')")
    public EvaluatorListResponse getTeamMemberEvaluators(
            @PathVariable UUID subjectUserId,
            @PathVariable UUID cycleSubjectId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return cycleValidationService.getEvaluatorsForPdm(cycleSubjectId, subjectUserId, user.id());
    }

    @PostMapping("/api/my-team/{subjectUserId}/cycles/{cycleSubjectId}/evaluators")
    @PreAuthorize("hasAuthority('PDM')")
    public ResponseEntity<EvaluatorItemDto> addTeamMemberEvaluator(
            @PathVariable UUID subjectUserId,
            @PathVariable UUID cycleSubjectId,
            @Valid @RequestBody AddEvaluatorRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        EvaluatorItemDto created = cycleValidationService.addEvaluatorByPdm(cycleSubjectId, request.userId(), subjectUserId, user.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
