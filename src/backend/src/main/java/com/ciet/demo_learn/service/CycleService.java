package com.ciet.demo_learn.service;

import com.ciet.demo_learn.dto.ActiveCycleDto;
import com.ciet.demo_learn.dto.ActiveCyclesResponse;
import com.ciet.demo_learn.mapper.CycleMapper;
import com.ciet.demo_learn.model.Cycle;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.repository.CycleRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CycleService {

    private final CycleSubjectService cycleSubjectService;
    private final CycleEvaluatorService cycleEvaluatorService;
    private final CycleMapper cycleMapper;
    private final CycleRepository cycleRepository;

    public CycleService(
            CycleSubjectService cycleSubjectService,
            CycleEvaluatorService cycleEvaluatorService,
            CycleMapper cycleMapper,
            CycleRepository cycleRepository) {
        this.cycleSubjectService = cycleSubjectService;
        this.cycleEvaluatorService = cycleEvaluatorService;
        this.cycleMapper = cycleMapper;
        this.cycleRepository = cycleRepository;
    }

    public ActiveCyclesResponse getActiveCycles(UUID userId) {
        List<CycleSubject> subjects = cycleSubjectService.findActiveBySubjectUserId(userId);
        List<ActiveCycleDto> dtos = subjects.stream().map(this::toDto).toList();
        return new ActiveCyclesResponse(dtos);
    }

    private ActiveCycleDto toDto(CycleSubject cs) {
        UUID csId = cs.getId();

        long total = cycleEvaluatorService.countTotalByCycleSubjectId(csId);
        long responded = cycleEvaluatorService.countRespondedByCycleSubjectId(csId);
        double responseRate = total == 0 ? 0.0 : (responded / (double) total);

        Instant deadlineInstant = cs.getValidationDeadline() != null
                ? cs.getValidationDeadline()
                : cs.getCycle().getCollectionDeadline();

        String collectionDeadline = deadlineInstant != null
                ? DateTimeFormatter.ISO_INSTANT.format(deadlineInstant)
                : null;

        return cycleMapper.toDto(cs, collectionDeadline, resolveDaysRemaining(deadlineInstant),
                responseRate, (int) total, (int) responded);
    }

    private Integer resolveDaysRemaining(Instant deadline) {
        if (deadline == null) return null;
        double days = (deadline.toEpochMilli() - Instant.now().toEpochMilli()) / 86_400_000.0;
        return days < 0 ? 0 : (int) Math.ceil(days);
    }

    @Transactional
    public Cycle save(Cycle cycle) {
        return cycleRepository.save(cycle);
    }
}
