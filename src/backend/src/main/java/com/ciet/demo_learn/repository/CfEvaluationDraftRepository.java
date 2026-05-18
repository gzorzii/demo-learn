package com.ciet.demo_learn.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ciet.demo_learn.model.CfEvaluationDraft;

public interface CfEvaluationDraftRepository extends JpaRepository<CfEvaluationDraft, UUID> {

    Optional<CfEvaluationDraft> findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId);
}
