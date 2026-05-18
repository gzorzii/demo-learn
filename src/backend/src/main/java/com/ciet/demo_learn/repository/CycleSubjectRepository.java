package com.ciet.demo_learn.repository;

import com.ciet.demo_learn.model.CycleSubject;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CycleSubjectRepository extends JpaRepository<CycleSubject, UUID> {

    @Query("""
            SELECT cs FROM CycleSubject cs
            JOIN FETCH cs.cycle c
            WHERE cs.subjectUser.id = :userId
            AND cs.closedAt IS NULL
            AND cs.deletedAt IS NULL
            AND c.status NOT IN (com.ciet.demo_learn.enums.CycleStatus.CLOSED, com.ciet.demo_learn.enums.CycleStatus.CANCELLED)
            AND c.deletedAt IS NULL
            """)
    List<CycleSubject> findActiveBySubjectUserId(@Param("userId") UUID userId);

    @Query("""
            SELECT COUNT(cs) > 0 FROM CycleSubject cs
            JOIN cs.cycle c
            WHERE cs.subjectUser.id = :userId
            AND cs.closedAt IS NULL AND cs.deletedAt IS NULL
            AND c.cycleType = com.ciet.demo_learn.enums.CycleType.CF
            AND c.status NOT IN (com.ciet.demo_learn.enums.CycleStatus.CLOSED, com.ciet.demo_learn.enums.CycleStatus.CANCELLED)
            AND c.deletedAt IS NULL
            """)
    boolean existsActiveCfBySubjectUserId(@Param("userId") UUID userId);

    @Query("""
            SELECT COUNT(cs) > 0 FROM CycleSubject cs
            JOIN cs.cycle c
            WHERE cs.subjectUser.id = :userId
            AND cs.closedAt IS NULL AND cs.deletedAt IS NULL
            AND c.cycleType = com.ciet.demo_learn.enums.CycleType.PR
            AND c.status NOT IN (com.ciet.demo_learn.enums.CycleStatus.CLOSED, com.ciet.demo_learn.enums.CycleStatus.CANCELLED)
            AND c.deletedAt IS NULL
            """)
    boolean existsActivePrBySubjectUserId(@Param("userId") UUID userId);

    @Query("SELECT cs FROM CycleSubject cs JOIN FETCH cs.cycle JOIN FETCH cs.subjectUser WHERE cs.id = :id AND cs.subjectUser.id = :subjectUserId AND cs.deletedAt IS NULL")
    Optional<CycleSubject> findByIdAndSubjectUserIdAndDeletedAtIsNull(@Param("id") UUID id, @Param("subjectUserId") UUID subjectUserId);

    @Query("""
            SELECT cs FROM CycleSubject cs JOIN FETCH cs.cycle
            WHERE cs.status = 'VALIDATING_EVALUATORS'
              AND cs.validationDeadline <= :now
              AND cs.deletedAt IS NULL
              AND cs.closedAt IS NULL
            """)
    List<CycleSubject> findAllExpiredValidations(@Param("now") Instant now);

    @Query("SELECT cs FROM CycleSubject cs JOIN FETCH cs.cycle JOIN FETCH cs.subjectUser WHERE cs.id = :id AND cs.deletedAt IS NULL")
    Optional<CycleSubject> findByIdWithCycleAndSubjectUser(@Param("id") UUID id);
}
