package com.ciet.demo_learn.service;

import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.repository.CycleSubjectRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CycleSubjectService {

    private final CycleSubjectRepository cycleSubjectRepository;

    public CycleSubjectService(CycleSubjectRepository cycleSubjectRepository) {
        this.cycleSubjectRepository = cycleSubjectRepository;
    }

    public List<CycleSubject> findActiveBySubjectUserId(UUID userId) {
        return cycleSubjectRepository.findActiveBySubjectUserId(userId);
    }

    public boolean existsActiveCfBySubjectUserId(UUID userId) {
        return cycleSubjectRepository.existsActiveCfBySubjectUserId(userId);
    }

    public boolean existsActivePrBySubjectUserId(UUID userId) {
        return cycleSubjectRepository.existsActivePrBySubjectUserId(userId);
    }

    @Transactional
    public CycleSubject save(CycleSubject cs) {
        return cycleSubjectRepository.save(cs);
    }

    public Optional<CycleSubject> findByIdAndSubjectUserId(UUID id, UUID subjectUserId) {
        return cycleSubjectRepository.findByIdAndSubjectUserIdAndDeletedAtIsNull(id, subjectUserId);
    }

    public List<CycleSubject> findAllExpiredValidations(Instant now) {
        return cycleSubjectRepository.findAllExpiredValidations(now);
    }
}
