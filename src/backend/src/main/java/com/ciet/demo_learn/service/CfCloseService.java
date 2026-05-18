package com.ciet.demo_learn.service;

import com.ciet.demo_learn.enums.CycleStatus;
import com.ciet.demo_learn.enums.CycleType;
import com.ciet.demo_learn.enums.TriggerType;
import com.ciet.demo_learn.exception.EvaluationConflictException;
import com.ciet.demo_learn.exception.ResourceNotFoundException;
import com.ciet.demo_learn.model.Cycle;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.repository.CycleSubjectRepository;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Service
public class CfCloseService {

    private static final Set<TriggerType> MANUAL_TRIGGER_TYPES = Set.of(
            TriggerType.MANUAL_SUBJECT,
            TriggerType.MANUAL_PDM
    );

    private final CycleSubjectRepository cycleSubjectRepository;
    private final NotificationService notificationService;

    public CfCloseService(
            CycleSubjectRepository cycleSubjectRepository,
            NotificationService notificationService) {
        this.cycleSubjectRepository = cycleSubjectRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public void closeCycle(UUID cycleSubjectId, UUID userId) {
        CycleSubject cycleSubject = cycleSubjectRepository
                .findByIdWithCycleAndSubjectUser(cycleSubjectId)
                .orElseThrow(() -> new ResourceNotFoundException("cycle_subject not found"));

        Cycle cycle = cycleSubject.getCycle();

        if (cycle.getCycleType() != CycleType.CF) {
            throw new ResourceNotFoundException("cycle_subject is not of type CF");
        }

        if (!cycleSubject.getSubjectUser().getId().equals(userId)) {
            throw new AccessDeniedException("Authenticated user is not the subject of this cycle_subject");
        }

        if (!MANUAL_TRIGGER_TYPES.contains(cycle.getTriggerType())) {
            throw new EvaluationConflictException("NOT_MANUAL_CYCLE");
        }

        if (!"COLLECTING".equals(cycleSubject.getStatus())) {
            throw new EvaluationConflictException("CYCLE_ALREADY_CLOSED");
        }

        cycleSubject.setStatus("CLOSED");
        cycleSubject.setClosedAt(Instant.now());
        cycleSubject.setClosedBy(userId);

        cycle.setStatus(CycleStatus.CLOSED);
        cycle.setClosedAt(Instant.now());

        cycleSubjectRepository.save(cycleSubject);

        notificationService.notifyCfClosedBySubject(cycleSubjectId);
    }
}