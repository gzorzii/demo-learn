package com.ciet.demo_learn.service;

import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.repository.CycleEvaluatorRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CycleEvaluatorService {

    private final CycleEvaluatorRepository cycleEvaluatorRepository;

    public CycleEvaluatorService(CycleEvaluatorRepository cycleEvaluatorRepository) {
        this.cycleEvaluatorRepository = cycleEvaluatorRepository;
    }

    public long countTotalByCycleSubjectId(UUID cycleSubjectId) {
        return cycleEvaluatorRepository.countTotalByCycleSubjectId(cycleSubjectId);
    }

    public long countRespondedByCycleSubjectId(UUID cycleSubjectId) {
        return cycleEvaluatorRepository.countRespondedByCycleSubjectId(cycleSubjectId);
    }

    @Transactional
    public CycleEvaluator save(CycleEvaluator evaluator) {
        return cycleEvaluatorRepository.save(evaluator);
    }

    public List<CycleEvaluator> findByCycleSubjectId(UUID cycleSubjectId) {
        return cycleEvaluatorRepository.findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId);
    }

    public int countGuestsByCycleSubjectId(UUID cycleSubjectId) {
        return cycleEvaluatorRepository.countGuestsByCycleSubjectId(cycleSubjectId);
    }

    public boolean existsByEvaluatorUserIdAndCycleSubjectId(UUID evaluatorUserId, UUID cycleSubjectId) {
        return cycleEvaluatorRepository.existsByEvaluatorUserIdAndCycleSubjectIdAndDeletedAtIsNull(evaluatorUserId, cycleSubjectId);
    }

    public Optional<CycleEvaluator> findByIdAndCycleSubjectId(UUID evaluatorId, UUID cycleSubjectId) {
        return cycleEvaluatorRepository.findByIdAndCycleSubjectIdAndDeletedAtIsNull(evaluatorId, cycleSubjectId);
    }
}
