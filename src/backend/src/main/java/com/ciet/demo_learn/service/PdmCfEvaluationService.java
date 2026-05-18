package com.ciet.demo_learn.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ciet.demo_learn.dto.EvaluationState;
import com.ciet.demo_learn.dto.PdmDraftDto;
import com.ciet.demo_learn.dto.PdmEvaluationContextDto;
import com.ciet.demo_learn.dto.PdmResponseDto;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.enums.EvaluatorType;
import com.ciet.demo_learn.exception.EvaluationConflictException;
import com.ciet.demo_learn.exception.ResourceNotFoundException;
import com.ciet.demo_learn.model.CfPdmEvaluationDraft;
import com.ciet.demo_learn.model.CfPdmEvaluationResponse;
import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.repository.CfPdmEvaluationDraftRepository;
import com.ciet.demo_learn.repository.CfPdmEvaluationResponseRepository;
import com.ciet.demo_learn.repository.CycleEvaluatorRepository;

@Service
public class PdmCfEvaluationService {

    private final CycleEvaluatorRepository cycleEvaluatorRepository;
    private final CfPdmEvaluationDraftRepository draftRepository;
    private final CfPdmEvaluationResponseRepository responseRepository;
    private final NotificationService notificationService;

    public PdmCfEvaluationService(
            CycleEvaluatorRepository cycleEvaluatorRepository,
            CfPdmEvaluationDraftRepository draftRepository,
            CfPdmEvaluationResponseRepository responseRepository,
            NotificationService notificationService) {
        this.cycleEvaluatorRepository = cycleEvaluatorRepository;
        this.draftRepository = draftRepository;
        this.responseRepository = responseRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public PdmEvaluationContextDto getContext(UUID cycleSubjectId, UUID colaboradorId, UUID pdmId) {
        CycleEvaluator evaluator = findPdmEvaluator(cycleSubjectId, pdmId);
        validateColaboradorMatch(evaluator, colaboradorId);

        EvaluationState state = resolveState(evaluator);

        PdmDraftDto draft = null;
        PdmResponseDto response = null;

        if (state == EvaluationState.ALREADY_SUBMITTED) {
            response = responseRepository
                    .findByCycleEvaluatorIdAndDeletedAtIsNull(evaluator.getId())
                    .map(r -> new PdmResponseDto(r.getResultado(), r.getProntidao(), r.getAction(), r.getSubmittedAt()))
                    .orElse(null);
        } else {
            draft = draftRepository
                    .findByCycleEvaluatorIdAndDeletedAtIsNull(evaluator.getId())
                    .map(d -> new PdmDraftDto(d.getResultadoDraft(), d.getProntidaoDraft(), d.getActionDraft()))
                    .orElse(null);
        }

        return new PdmEvaluationContextDto(
                evaluator.getId(),
                evaluator.getCycleSubject().getId(),
                evaluator.getCycleSubject().getSubjectUser().getName(),
                evaluator.getCycleSubject().getCycle().getCollectionDeadline(),
                evaluator.getStatus().name(),
                state,
                draft,
                response
        );
    }

    @Transactional
    public void saveDraft(UUID cycleSubjectId, UUID colaboradorId, UUID pdmId,
                          String resultadoDraft, String prontidaoDraft, String actionDraft) {
        CycleEvaluator evaluator = findPdmEvaluator(cycleSubjectId, pdmId);
        validateColaboradorMatch(evaluator, colaboradorId);

        if (evaluator.getStatus() == EvaluatorStatus.RESPONDED) {
            throw new EvaluationConflictException("ALREADY_SUBMITTED");
        }
        if (!"COLLECTING".equals(evaluator.getCycleSubject().getStatus())) {
            throw new EvaluationConflictException("CYCLE_NOT_COLLECTING");
        }

        draftRepository.findByCycleEvaluatorIdAndDeletedAtIsNull(evaluator.getId())
                .ifPresentOrElse(
                        draft -> {
                            draft.setResultadoDraft(resultadoDraft);
                            draft.setProntidaoDraft(prontidaoDraft);
                            draft.setActionDraft(actionDraft);
                            draft.setUpdatedAt(Instant.now());
                        },
                        () -> {
                            CfPdmEvaluationDraft newDraft = new CfPdmEvaluationDraft();
                            newDraft.setCycleEvaluator(evaluator);
                            newDraft.setResultadoDraft(resultadoDraft);
                            newDraft.setProntidaoDraft(prontidaoDraft);
                            newDraft.setActionDraft(actionDraft);
                            newDraft.setUpdatedAt(Instant.now());
                            draftRepository.save(newDraft);
                        }
                );
    }

    @Transactional
    public void submit(UUID cycleSubjectId, UUID colaboradorId, UUID pdmId,
                       String resultado, String prontidao, String action) {
        CycleEvaluator evaluator = findPdmEvaluator(cycleSubjectId, pdmId);
        validateColaboradorMatch(evaluator, colaboradorId);

        if (evaluator.getStatus() == EvaluatorStatus.RESPONDED) {
            throw new EvaluationConflictException("ALREADY_SUBMITTED");
        }
        if (!"COLLECTING".equals(evaluator.getCycleSubject().getStatus())) {
            throw new EvaluationConflictException("CYCLE_NOT_COLLECTING");
        }
        Instant deadline = evaluator.getCycleSubject().getCycle().getCollectionDeadline();
        if (deadline != null && Instant.now().isAfter(deadline)) {
            throw new EvaluationConflictException("DEADLINE_EXPIRED");
        }

        Instant now = Instant.now();

        CfPdmEvaluationResponse response = new CfPdmEvaluationResponse();
        response.setCycleEvaluator(evaluator);
        response.setResultado(resultado);
        response.setProntidao(prontidao);
        response.setAction(action);
        response.setSubmittedAt(now);
        responseRepository.save(response);

        evaluator.setStatus(EvaluatorStatus.RESPONDED);
        evaluator.setRespondedAt(now);
        cycleEvaluatorRepository.save(evaluator);

        draftRepository.findByCycleEvaluatorIdAndDeletedAtIsNull(evaluator.getId())
                .ifPresent(draft -> draft.setDeletedAt(now));

        notificationService.notifyPdmEvaluationSubmitted(evaluator.getId());
    }

    private CycleEvaluator findPdmEvaluator(UUID cycleSubjectId, UUID pdmId) {
        return cycleEvaluatorRepository
                .findPdmEvaluatorByCycleSubjectIdAndEvaluatorUserId(cycleSubjectId, pdmId, EvaluatorType.PDM)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação PDM não encontrada."));
    }

    private void validateColaboradorMatch(CycleEvaluator evaluator, UUID colaboradorId) {
        if (!evaluator.getCycleSubject().getSubjectUser().getId().equals(colaboradorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private EvaluationState resolveState(CycleEvaluator evaluator) {
        if (evaluator.getStatus() == EvaluatorStatus.RESPONDED) {
            return EvaluationState.ALREADY_SUBMITTED;
        }
        String csStatus = evaluator.getCycleSubject().getStatus();
        if (!"COLLECTING".equals(csStatus)) {
            return EvaluationState.CYCLE_NOT_COLLECTING;
        }
        Instant deadline = evaluator.getCycleSubject().getCycle().getCollectionDeadline();
        if (deadline != null && Instant.now().isAfter(deadline)) {
            return EvaluationState.DEADLINE_EXPIRED;
        }
        return EvaluationState.OPEN;
    }
}
