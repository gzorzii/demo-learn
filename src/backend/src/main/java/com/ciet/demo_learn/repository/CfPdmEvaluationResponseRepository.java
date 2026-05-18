package com.ciet.demo_learn.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ciet.demo_learn.model.CfPdmEvaluationResponse;

public interface CfPdmEvaluationResponseRepository extends JpaRepository<CfPdmEvaluationResponse, UUID> {

    Optional<CfPdmEvaluationResponse> findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId);
}
