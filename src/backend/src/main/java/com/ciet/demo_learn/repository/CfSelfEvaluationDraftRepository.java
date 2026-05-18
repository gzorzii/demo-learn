package com.ciet.demo_learn.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ciet.demo_learn.model.CfSelfEvaluationDraft;

public interface CfSelfEvaluationDraftRepository extends JpaRepository<CfSelfEvaluationDraft, UUID> {

    Optional<CfSelfEvaluationDraft> findByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId);
}
