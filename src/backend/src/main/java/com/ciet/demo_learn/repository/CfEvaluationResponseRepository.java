package com.ciet.demo_learn.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ciet.demo_learn.model.CfEvaluationResponse;

public interface CfEvaluationResponseRepository extends JpaRepository<CfEvaluationResponse, UUID> {

    Optional<CfEvaluationResponse> findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId);

    boolean existsByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId);
}
