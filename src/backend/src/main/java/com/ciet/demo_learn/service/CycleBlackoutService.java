package com.ciet.demo_learn.service;

import com.ciet.demo_learn.model.CycleBlackout;
import com.ciet.demo_learn.repository.CycleBlackoutRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CycleBlackoutService {

    private final CycleBlackoutRepository cycleBlackoutRepository;

    public CycleBlackoutService(CycleBlackoutRepository cycleBlackoutRepository) {
        this.cycleBlackoutRepository = cycleBlackoutRepository;
    }

    public boolean existsActiveBlackoutForUser(UUID userId, Instant now) {
        return cycleBlackoutRepository.existsActiveBlackoutForUser(userId, now);
    }

    public Optional<CycleBlackout> findActiveBlackoutForUser(UUID userId, Instant now) {
        return cycleBlackoutRepository.findActiveBlackoutForUser(userId, now);
    }
}
