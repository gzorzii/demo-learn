package com.ciet.demo_learn.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ciet.demo_learn.dto.EvaluationContextDto;
import com.ciet.demo_learn.dto.EvaluationState;
import com.ciet.demo_learn.dto.PendingEvaluationItemDto;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.exception.EvaluationConflictException;
import com.ciet.demo_learn.exception.ResourceNotFoundException;
import com.ciet.demo_learn.model.CfEvaluationDraft;
import com.ciet.demo_learn.model.CfEvaluationResponse;
import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.repository.CfEvaluationDraftRepository;
import com.ciet.demo_learn.repository.CfEvaluationResponseRepository;
import com.ciet.demo_learn.repository.CycleEvaluatorRepository;

@Service
public class CfGuestEvaluationService {

    private final CycleEvaluatorRepository cycleEvaluatorRepository;
    private final CfEvaluationResponseRepository responseRepository;
    private final CfEvaluationDraftRepository draftRepository;
    private final NotificationService notificationService;

    public CfGuestEvaluationService(
            CycleEvaluatorRepository cycleEvaluatorRepository,
            CfEvaluationResponseRepository responseRepository,
            CfEvaluationDraftRepository draftRepository,
            NotificationService notificationService) {
        this.cycleEvaluatorRepository = cycleEvaluatorRepository;
        this.responseRepository = responseRepository;
        this.draftRepository = draftRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public EvaluationContextDto getEvaluationContext(UUID cycleEvaluatorId, UUID userId) {
        CycleEvaluator evaluator = cycleEvaluatorRepository
                .findByIdAndEvaluatorUserIdAndDeletedAtIsNull(cycleEvaluatorId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada para o usuário informado."));

        Instant now = Instant.now();
        EvaluationState state = resolveState(evaluator, now);

        Instant alreadySubmittedAt = state == EvaluationState.ALREADY_SUBMITTED
                ? evaluator.getRespondedAt()
                : null;

        String draftText = draftRepository
                .findByCycleEvaluatorIdAndDeletedAtIsNull(cycleEvaluatorId)
                .map(CfEvaluationDraft::getDraftText)
                .orElse(null);

        return new EvaluationContextDto(
                evaluator.getCycleSubject().getSubjectUser().getName(),
                evaluator.getCycleSubject().getId(),
                evaluator.getCycleSubject().getCycle().getCollectionDeadline(),
                state,
                alreadySubmittedAt,
                draftText
        );
    }

    @Transactional(readOnly = true)
    public List<PendingEvaluationItemDto> listPendingEvaluations(UUID userId) {
        Instant now = Instant.now();
        return cycleEvaluatorRepository.findPendingByEvaluatorUserId(userId).stream()
                .filter(ce -> {
                    Instant deadline = ce.getCycleSubject().getCycle().getCollectionDeadline();
                    return deadline == null || !now.isAfter(deadline);
                })
                .map(ce -> new PendingEvaluationItemDto(
                        ce.getId(),
                        ce.getCycleSubject().getSubjectUser().getName(),
                        ce.getCycleSubject().getCycle().getCollectionDeadline()
                ))
                .toList();
    }

    @Transactional
    public void saveDraft(UUID cycleEvaluatorId, UUID userId, String draftText) {
        CycleEvaluator evaluator = cycleEvaluatorRepository
                .findByIdAndEvaluatorUserIdAndDeletedAtIsNull(cycleEvaluatorId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada para o usuário informado."));

        if (evaluator.getStatus() == EvaluatorStatus.RESPONDED) {
            throw new EvaluationConflictException("ALREADY_SUBMITTED");
        }

        draftRepository.findByCycleEvaluatorIdAndDeletedAtIsNull(cycleEvaluatorId)
                .ifPresentOrElse(
                        draft -> {
                            draft.setDraftText(draftText);
                            draft.setUpdatedAt(Instant.now());
                        },
                        () -> {
                            CfEvaluationDraft newDraft = new CfEvaluationDraft();
                            newDraft.setCycleEvaluator(evaluator);
                            newDraft.setDraftText(draftText);
                            newDraft.setUpdatedAt(Instant.now());
                            draftRepository.save(newDraft);
                        }
                );
    }

    @Transactional
    public void submitEvaluation(UUID cycleEvaluatorId, UUID userId, String responseText) {
        CycleEvaluator evaluator = cycleEvaluatorRepository
                .findByIdAndEvaluatorUserIdAndDeletedAtIsNull(cycleEvaluatorId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada para o usuário informado."));

        if (evaluator.getStatus() == EvaluatorStatus.RESPONDED) {
            throw new EvaluationConflictException("ALREADY_SUBMITTED");
        }

        String subjectStatus = evaluator.getCycleSubject().getStatus();
        if ("CLOSED".equals(subjectStatus) || "CANCELLED".equals(subjectStatus)) {
            throw new EvaluationConflictException("CYCLE_CLOSED");
        }

        Instant now = Instant.now();
        Instant deadline = evaluator.getCycleSubject().getCycle().getCollectionDeadline();
        if (deadline != null && now.isAfter(deadline)) {
            throw new EvaluationConflictException("DEADLINE_EXPIRED");
        }

        CfEvaluationResponse response = new CfEvaluationResponse();
        response.setCycleEvaluator(evaluator);
        response.setResponseText(responseText);
        response.setSubmittedAt(now);
        responseRepository.save(response);

        evaluator.setStatus(EvaluatorStatus.RESPONDED);
        evaluator.setRespondedAt(now);
        cycleEvaluatorRepository.save(evaluator);

        draftRepository.findByCycleEvaluatorIdAndDeletedAtIsNull(cycleEvaluatorId)
                .ifPresent(draft -> draft.setDeletedAt(now));

        UUID savedEvaluatorId = evaluator.getId();
        notificationService.notifyEvaluationSubmitted(savedEvaluatorId);
    }

    private EvaluationState resolveState(CycleEvaluator evaluator, Instant now) {
        if (evaluator.getStatus() == EvaluatorStatus.RESPONDED) {
            return EvaluationState.ALREADY_SUBMITTED;
        }

        String subjectStatus = evaluator.getCycleSubject().getStatus();
        if ("CLOSED".equals(subjectStatus) || "CANCELLED".equals(subjectStatus)) {
            return EvaluationState.CYCLE_CLOSED;
        }

        Instant deadline = evaluator.getCycleSubject().getCycle().getCollectionDeadline();
        if (deadline != null && now.isAfter(deadline)) {
            return EvaluationState.DEADLINE_EXPIRED;
        }

        return EvaluationState.OPEN;
    }
}
