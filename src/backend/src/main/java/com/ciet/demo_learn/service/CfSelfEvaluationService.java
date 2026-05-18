package com.ciet.demo_learn.service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ciet.demo_learn.dto.EvaluationState;
import com.ciet.demo_learn.dto.SelfEvaluationContextDto;
import com.ciet.demo_learn.exception.EvaluationConflictException;
import com.ciet.demo_learn.exception.ResourceNotFoundException;
import com.ciet.demo_learn.model.CfSelfEvaluationDraft;
import com.ciet.demo_learn.model.CfSelfEvaluationResponse;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.repository.CfSelfEvaluationDraftRepository;
import com.ciet.demo_learn.repository.CfSelfEvaluationResponseRepository;
import com.ciet.demo_learn.repository.CycleSubjectRepository;

@Service
public class CfSelfEvaluationService {

    private final CycleSubjectRepository cycleSubjectRepository;
    private final CfSelfEvaluationDraftRepository draftRepository;
    private final CfSelfEvaluationResponseRepository responseRepository;

    public CfSelfEvaluationService(
            CycleSubjectRepository cycleSubjectRepository,
            CfSelfEvaluationDraftRepository draftRepository,
            CfSelfEvaluationResponseRepository responseRepository) {
        this.cycleSubjectRepository = cycleSubjectRepository;
        this.draftRepository = draftRepository;
        this.responseRepository = responseRepository;
    }

    @Transactional(readOnly = true)
    public SelfEvaluationContextDto getContext(UUID cycleSubjectId, UUID userId) {
        CycleSubject subject = cycleSubjectRepository
                .findByIdAndSubjectUserIdAndDeletedAtIsNull(cycleSubjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Ciclo não encontrado para o usuário informado."));

        EvaluationState state = resolveState(subject);

        String submittedText = null;
        Instant submittedAt = null;
        String draftText = null;

        if (state == EvaluationState.ALREADY_SUBMITTED) {
            CfSelfEvaluationResponse response = responseRepository
                    .findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)
                    .orElse(null);
            if (response != null) {
                submittedText = response.getResponseText();
                submittedAt = response.getSubmittedAt();
            }
        } else {
            draftText = draftRepository
                    .findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)
                    .map(CfSelfEvaluationDraft::getDraftText)
                    .orElse(null);
        }

        Instant deadlineInstant = subject.getCycle().getCollectionDeadline();
        String collectionDeadline = deadlineInstant != null
                ? DateTimeFormatter.ISO_INSTANT.format(deadlineInstant)
                : null;

        return new SelfEvaluationContextDto(
                subject.getSubjectUser().getName(),
                subject.getId(),
                collectionDeadline,
                state,
                submittedText,
                submittedAt,
                draftText
        );
    }

    @Transactional
    public void saveDraft(UUID cycleSubjectId, UUID userId, String draftText) {
        CycleSubject subject = cycleSubjectRepository
                .findByIdAndSubjectUserIdAndDeletedAtIsNull(cycleSubjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Ciclo não encontrado para o usuário informado."));

        if ("SUBMITTED".equals(subject.getSelfEvaluationStatus())) {
            throw new EvaluationConflictException("ALREADY_SUBMITTED");
        }
        if (!"COLLECTING".equals(subject.getStatus())) {
            throw new EvaluationConflictException("CYCLE_NOT_COLLECTING");
        }

        draftRepository.findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)
                .ifPresentOrElse(
                        draft -> {
                            draft.setDraftText(draftText);
                            draft.setUpdatedAt(Instant.now());
                        },
                        () -> {
                            CfSelfEvaluationDraft newDraft = new CfSelfEvaluationDraft();
                            newDraft.setCycleSubject(subject);
                            newDraft.setDraftText(draftText);
                            newDraft.setUpdatedAt(Instant.now());
                            draftRepository.save(newDraft);
                        }
                );
    }

    @Transactional
    public void submit(UUID cycleSubjectId, UUID userId, String responseText) {
        CycleSubject subject = cycleSubjectRepository
                .findByIdAndSubjectUserIdAndDeletedAtIsNull(cycleSubjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Ciclo não encontrado para o usuário informado."));

        if ("SUBMITTED".equals(subject.getSelfEvaluationStatus())) {
            throw new EvaluationConflictException("ALREADY_SUBMITTED");
        }
        if (!"COLLECTING".equals(subject.getStatus())) {
            throw new EvaluationConflictException("CYCLE_NOT_COLLECTING");
        }

        Instant now = Instant.now();

        CfSelfEvaluationResponse response = new CfSelfEvaluationResponse();
        response.setCycleSubject(subject);
        response.setResponseText(responseText);
        response.setSubmittedAt(now);
        responseRepository.save(response);

        subject.setSelfEvaluationStatus("SUBMITTED");
        cycleSubjectRepository.save(subject);

        draftRepository.findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)
                .ifPresent(draft -> draft.setDeletedAt(now));
    }

    private EvaluationState resolveState(CycleSubject subject) {
        if ("SUBMITTED".equals(subject.getSelfEvaluationStatus())) {
            return EvaluationState.ALREADY_SUBMITTED;
        }
        if (!"COLLECTING".equals(subject.getStatus())) {
            return EvaluationState.CYCLE_NOT_COLLECTING;
        }
        return EvaluationState.OPEN;
    }
}
