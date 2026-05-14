package com.ciet.demo_learn.repository;

import com.ciet.demo_learn.model.CycleEvaluator;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CycleEvaluatorRepository extends JpaRepository<CycleEvaluator, UUID> {

    @Query("SELECT COUNT(ce) FROM CycleEvaluator ce WHERE ce.cycleSubject.id = :csId AND ce.deletedAt IS NULL")
    long countTotalByCycleSubjectId(UUID csId);

    @Query("""
            SELECT COUNT(ce) FROM CycleEvaluator ce
            WHERE ce.cycleSubject.id = :csId
            AND ce.deletedAt IS NULL
            AND ce.status IN (com.ciet.demo_learn.enums.EvaluatorStatus.RESPONDED, com.ciet.demo_learn.enums.EvaluatorStatus.SKIPPED)
            """)
    long countRespondedByCycleSubjectId(UUID csId);
}
