package com.ciet.demo_learn.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ciet.demo_learn.model.CfPdmEvaluationDraft;

public interface CfPdmEvaluationDraftRepository extends JpaRepository<CfPdmEvaluationDraft, UUID> {

    Optional<CfPdmEvaluationDraft> findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId);
}
