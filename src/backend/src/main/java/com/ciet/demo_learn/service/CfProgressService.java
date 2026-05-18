package com.ciet.demo_learn.service;

import com.ciet.demo_learn.dto.CfProgressDto;
import com.ciet.demo_learn.dto.GuestEvaluatorStatusDto;
import com.ciet.demo_learn.dto.PdmCfProgressDto;
import com.ciet.demo_learn.enums.CycleType;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.enums.EvaluatorType;
import com.ciet.demo_learn.exception.ResourceNotFoundException;
import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.repository.CycleEvaluatorRepository;
import com.ciet.demo_learn.repository.CycleSubjectRepository;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CfProgressService {

    private final CycleSubjectRepository cycleSubjectRepository;
    private final CycleEvaluatorRepository cycleEvaluatorRepository;

    public CfProgressService(
            CycleSubjectRepository cycleSubjectRepository,
            CycleEvaluatorRepository cycleEvaluatorRepository) {
        this.cycleSubjectRepository = cycleSubjectRepository;
        this.cycleEvaluatorRepository = cycleEvaluatorRepository;
    }

    public CfProgressDto getForSubject(UUID cycleSubjectId, UUID userId) {
        CycleSubject cs = cycleSubjectRepository
                .findByIdAndSubjectUserIdAndDeletedAtIsNull(cycleSubjectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("cycle_subject not found"));

        if (cs.getCycle().getCycleType() != CycleType.CF) {
            throw new ResourceNotFoundException("cycle_subject is not of type CF");
        }

        List<CycleEvaluator> evaluators = cycleEvaluatorRepository.findAllWithUserByCycleSubjectId(cycleSubjectId);

        String pdmEvaluationStatus = evaluators.stream()
                .filter(ce -> ce.getEvaluatorType() == EvaluatorType.PDM)
                .map(ce -> ce.getStatus().name())
                .findFirst()
                .orElse(null);

        List<CycleEvaluator> guests = evaluators.stream()
                .filter(ce -> ce.getEvaluatorType() != EvaluatorType.PDM && ce.getEvaluatorType() != EvaluatorType.SELF)
                .toList();

        int guestTotal = guests.size();
        int guestResponded = (int) guests.stream()
                .filter(ce -> ce.getStatus() == EvaluatorStatus.RESPONDED || ce.getStatus() == EvaluatorStatus.SKIPPED)
                .count();

        return new CfProgressDto(
                cs.getId(),
                cs.getCycle().getStatus().name(),
                cs.getSelfEvaluationStatus(),
                pdmEvaluationStatus,
                guestTotal,
                guestResponded,
                cs.getCycle().getCollectionDeadline(),
                calculateDaysRemaining(cs.getCycle().getCollectionDeadline()),
                cs.getCycle().getTriggerType() != null ? cs.getCycle().getTriggerType().name() : null
        );
    }

    public PdmCfProgressDto getForPdm(UUID colaboradorId, UUID cycleSubjectId, UUID pdmUserId) {
        CycleSubject cs = cycleSubjectRepository
                .findByIdWithCycleAndSubjectUser(cycleSubjectId)
                .orElseThrow(() -> new ResourceNotFoundException("cycle_subject not found"));

        if (cs.getCycle().getCycleType() != CycleType.CF) {
            throw new ResourceNotFoundException("cycle_subject is not of type CF");
        }

        boolean isPdm = cycleEvaluatorRepository
                .findPdmEvaluatorByCycleSubjectIdAndEvaluatorUserId(cycleSubjectId, pdmUserId, EvaluatorType.PDM)
                .isPresent();

        if (!isPdm) {
            throw new AccessDeniedException("Authenticated user is not the PDM for this cycle_subject");
        }

        if (!cs.getSubjectUser().getId().equals(colaboradorId)) {
            throw new AccessDeniedException("cycle_subject does not belong to the specified colaborador");
        }

        List<CycleEvaluator> evaluators = cycleEvaluatorRepository.findAllWithUserByCycleSubjectId(cycleSubjectId);

        String pdmEvaluationStatus = evaluators.stream()
                .filter(ce -> ce.getEvaluatorType() == EvaluatorType.PDM)
                .map(ce -> ce.getStatus().name())
                .findFirst()
                .orElse(null);

        List<CycleEvaluator> guests = evaluators.stream()
                .filter(ce -> ce.getEvaluatorType() != EvaluatorType.PDM && ce.getEvaluatorType() != EvaluatorType.SELF)
                .toList();

        int guestTotal = guests.size();
        int guestResponded = (int) guests.stream()
                .filter(ce -> ce.getStatus() == EvaluatorStatus.RESPONDED || ce.getStatus() == EvaluatorStatus.SKIPPED)
                .count();

        List<GuestEvaluatorStatusDto> guestEvaluators = guests.stream()
                .map(ce -> new GuestEvaluatorStatusDto(
                        ce.getEvaluatorUser().getName(),
                        ce.getStatus() == EvaluatorStatus.RESPONDED || ce.getStatus() == EvaluatorStatus.SKIPPED))
                .toList();

        return new PdmCfProgressDto(
                cs.getId(),
                cs.getCycle().getStatus().name(),
                cs.getSelfEvaluationStatus(),
                pdmEvaluationStatus,
                guestTotal,
                guestResponded,
                cs.getCycle().getCollectionDeadline(),
                calculateDaysRemaining(cs.getCycle().getCollectionDeadline()),
                guestEvaluators,
                cs.getCycle().getTriggerType() != null ? cs.getCycle().getTriggerType().name() : null
        );
    }

    private Integer calculateDaysRemaining(Instant deadline) {
        if (deadline == null) return null;
        long seconds = Instant.now().until(deadline, ChronoUnit.SECONDS);
        if (seconds <= 0) return 0;
        return (int) Math.ceil(seconds / 86400.0);
    }
}
