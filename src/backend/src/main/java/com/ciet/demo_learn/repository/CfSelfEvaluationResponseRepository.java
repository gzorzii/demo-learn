package com.ciet.demo_learn.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ciet.demo_learn.model.CfSelfEvaluationResponse;

public interface CfSelfEvaluationResponseRepository extends JpaRepository<CfSelfEvaluationResponse, UUID> {

    Optional<CfSelfEvaluationResponse> findByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId);
}
