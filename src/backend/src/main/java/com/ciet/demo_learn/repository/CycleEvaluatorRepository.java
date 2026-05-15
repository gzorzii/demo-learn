package com.ciet.demo_learn.repository;

import com.ciet.demo_learn.model.CycleEvaluator;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
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

    @Query("SELECT ce FROM CycleEvaluator ce JOIN FETCH ce.evaluatorUser WHERE ce.cycleSubject.id = :cycleSubjectId AND ce.deletedAt IS NULL")
    List<CycleEvaluator> findByCycleSubjectIdAndDeletedAtIsNull(@Param("cycleSubjectId") UUID cycleSubjectId);

    @Query("SELECT COUNT(ce) FROM CycleEvaluator ce WHERE ce.cycleSubject.id = :id AND ce.isMandatory = false AND ce.deletedAt IS NULL")
    int countGuestsByCycleSubjectId(@Param("id") UUID id);

    boolean existsByEvaluatorUserIdAndCycleSubjectIdAndDeletedAtIsNull(UUID evaluatorUserId, UUID cycleSubjectId);

    @Query("SELECT ce FROM CycleEvaluator ce WHERE ce.id = :id AND ce.cycleSubject.id = :cycleSubjectId AND ce.deletedAt IS NULL")
    Optional<CycleEvaluator> findByIdAndCycleSubjectIdAndDeletedAtIsNull(@Param("id") UUID id, @Param("cycleSubjectId") UUID cycleSubjectId);
}
