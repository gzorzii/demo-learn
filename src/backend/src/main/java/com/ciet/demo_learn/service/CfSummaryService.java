package com.ciet.demo_learn.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ciet.demo_learn.dto.CfSummaryDto;
import com.ciet.demo_learn.dto.GuestEvaluationDetailDto;
import com.ciet.demo_learn.dto.PdmCfSummaryDto;
import com.ciet.demo_learn.dto.PdmEvaluationSummaryDto;
import com.ciet.demo_learn.dto.SelfEvaluationSummaryDto;
import com.ciet.demo_learn.enums.CycleStatus;
import com.ciet.demo_learn.enums.CycleType;
import com.ciet.demo_learn.enums.EvaluatorType;
import com.ciet.demo_learn.exception.ResourceNotFoundException;
import com.ciet.demo_learn.model.CfEvaluationResponse;
import com.ciet.demo_learn.model.CfPdmEvaluationResponse;
import com.ciet.demo_learn.model.CfSelfEvaluationResponse;
import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.repository.CfEvaluationResponseRepository;
import com.ciet.demo_learn.repository.CfPdmEvaluationResponseRepository;
import com.ciet.demo_learn.repository.CfSelfEvaluationResponseRepository;
import com.ciet.demo_learn.repository.CycleEvaluatorRepository;
import com.ciet.demo_learn.repository.CycleSubjectRepository;

@Service
@Transactional(readOnly = true)
public class CfSummaryService {

    private final CycleSubjectRepository cycleSubjectRepository;
    private final CycleEvaluatorRepository evaluatorRepository;
    private final CfSelfEvaluationResponseRepository selfEvalResponseRepo;
    private final CfPdmEvaluationResponseRepository pdmResponseRepo;
    private final CfEvaluationResponseRepository guestResponseRepo;

    public CfSummaryService(
            CycleSubjectRepository cycleSubjectRepository,
            CycleEvaluatorRepository evaluatorRepository,
            CfSelfEvaluationResponseRepository selfEvalResponseRepo,
            CfPdmEvaluationResponseRepository pdmResponseRepo,
            CfEvaluationResponseRepository guestResponseRepo) {
        this.cycleSubjectRepository = cycleSubjectRepository;
        this.evaluatorRepository = evaluatorRepository;
        this.selfEvalResponseRepo = selfEvalResponseRepo;
        this.pdmResponseRepo = pdmResponseRepo;
        this.guestResponseRepo = guestResponseRepo;
    }

    public CfSummaryDto getForSubject(UUID cycleSubjectId, UUID userId) {
        CycleSubject cs = cycleSubjectRepository
                .findByIdWithCycleAndSubjectUser(cycleSubjectId)
                .orElseThrow(() -> new ResourceNotFoundException("cycle_subject not found"));

        if (cs.getCycle().getCycleType() != CycleType.CF) {
            throw new ResourceNotFoundException("cycle_subject is not of type CF");
        }

        if (!cs.getSubjectUser().getId().equals(userId)) {
            throw new AccessDeniedException("Authenticated user is not the subject of this cycle_subject");
        }

        final String cycleStatus = cs.getCycle().getStatus().name();

        if (cs.getCycle().getStatus() != CycleStatus.CLOSED) {
            return new CfSummaryDto(cycleSubjectId, cycleStatus, null, null, null, null, null, null);
        }

        SelfEvaluationSummaryDto selfEvaluation = selfEvalResponseRepo
                .findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)
                .map(r -> new SelfEvaluationSummaryDto(r.getResponseText(), r.getSubmittedAt()))
                .orElse(null);

        List<CycleEvaluator> evaluators = evaluatorRepository.findAllWithUserByCycleSubjectId(cycleSubjectId);

        PdmEvaluationSummaryDto pdmEvaluation = evaluators.stream()
                .filter(e -> e.getEvaluatorType() == EvaluatorType.PDM)
                .findFirst()
                .flatMap(pdm -> pdmResponseRepo.findByCycleEvaluatorIdAndDeletedAtIsNull(pdm.getId()))
                .map(r -> new PdmEvaluationSummaryDto(r.getResultado(), r.getProntidao(), r.getAction(), r.getSubmittedAt()))
                .orElse(null);

        List<CycleEvaluator> guests = evaluators.stream()
                .filter(e -> !Boolean.TRUE.equals(e.getIsMandatory()))
                .toList();

        List<CfEvaluationResponse> guestResponses = guests.stream()
                .map(e -> guestResponseRepo.findByCycleEvaluatorIdAndDeletedAtIsNull(e.getId()))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();

        int respondentCount = guestResponses.size();

        if (respondentCount >= 3) {
            List<String> responseTexts = guestResponses.stream()
                    .map(CfEvaluationResponse::getResponseText)
                    .toList();
            return new CfSummaryDto(cycleSubjectId, cycleStatus, selfEvaluation, pdmEvaluation,
                    respondentCount, responseTexts, null, null);
        } else {
            return new CfSummaryDto(cycleSubjectId, cycleStatus, selfEvaluation, pdmEvaluation,
                    respondentCount, List.of(), true, null);
        }
    }

    public PdmCfSummaryDto getForPdm(UUID colaboradorId, UUID cycleSubjectId, UUID pdmUserId) {
        CycleSubject cs = cycleSubjectRepository
                .findByIdWithCycleAndSubjectUser(cycleSubjectId)
                .orElseThrow(() -> new ResourceNotFoundException("cycle_subject not found"));

        if (cs.getCycle().getCycleType() != CycleType.CF) {
            throw new ResourceNotFoundException("cycle_subject is not of type CF");
        }

        evaluatorRepository
                .findPdmEvaluatorByCycleSubjectIdAndEvaluatorUserId(cycleSubjectId, pdmUserId, EvaluatorType.PDM)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user is not the PDM for this cycle_subject"));

        if (!cs.getSubjectUser().getId().equals(colaboradorId)) {
            throw new AccessDeniedException("cycle_subject does not belong to the specified colaborador");
        }

        final String cycleStatus = cs.getCycle().getStatus().name();

        if (cs.getCycle().getStatus() != CycleStatus.CLOSED) {
            return new PdmCfSummaryDto(cycleSubjectId, cycleStatus, null, null, null, null, null);
        }

        SelfEvaluationSummaryDto selfEvaluation = selfEvalResponseRepo
                .findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)
                .map(r -> new SelfEvaluationSummaryDto(r.getResponseText(), r.getSubmittedAt()))
                .orElse(null);

        List<CycleEvaluator> evaluators = evaluatorRepository.findAllWithUserByCycleSubjectId(cycleSubjectId);

        PdmEvaluationSummaryDto pdmEvaluation = evaluators.stream()
                .filter(e -> e.getEvaluatorType() == EvaluatorType.PDM)
                .findFirst()
                .flatMap(pdm -> pdmResponseRepo.findByCycleEvaluatorIdAndDeletedAtIsNull(pdm.getId()))
                .map(r -> new PdmEvaluationSummaryDto(r.getResultado(), r.getProntidao(), r.getAction(), r.getSubmittedAt()))
                .orElse(null);

        List<CycleEvaluator> guests = evaluators.stream()
                .filter(e -> !Boolean.TRUE.equals(e.getIsMandatory()))
                .toList();

        List<GuestEvaluationDetailDto> guestEvaluations = guests.stream()
                .flatMap(e -> guestResponseRepo.findByCycleEvaluatorIdAndDeletedAtIsNull(e.getId())
                        .map(r -> new GuestEvaluationDetailDto(e.getEvaluatorUser().getName(), r.getResponseText()))
                        .stream())
                .toList();

        int respondentCount = guestEvaluations.size();

        return new PdmCfSummaryDto(cycleSubjectId, cycleStatus, selfEvaluation, pdmEvaluation,
                respondentCount, guestEvaluations, null);
    }
}