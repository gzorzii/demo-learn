package com.ciet.demo_learn.repository;

import com.ciet.demo_learn.model.CycleBlackout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface CycleBlackoutRepository extends JpaRepository<CycleBlackout, UUID> {

    @Query("""
            SELECT COUNT(cb) > 0 FROM CycleBlackout cb
            JOIN cb.prCycleGroup pcg
            JOIN pcg.cycle c
            JOIN CycleSubject cs ON cs.cycle = c AND cs.subjectUser.id = :userId
                                 AND cs.deletedAt IS NULL
            WHERE cb.startsAt <= :now AND cb.endsAt >= :now
            """)
    boolean existsActiveBlackoutForUser(@Param("userId") UUID userId, @Param("now") Instant now);

    @Query("""
            SELECT cb FROM CycleBlackout cb
            JOIN cb.prCycleGroup pcg
            JOIN pcg.cycle c
            JOIN CycleSubject cs ON cs.cycle = c AND cs.subjectUser.id = :userId
                                 AND cs.deletedAt IS NULL
            WHERE cb.startsAt <= :now AND cb.endsAt >= :now
            """)
    Optional<CycleBlackout> findActiveBlackoutForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
