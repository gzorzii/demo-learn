package com.ciet.demo_learn.domain.discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.*;
public interface DiscountRepository extends JpaRepository<Discount, UUID> {
    List<Discount> findAllByBranchIdAndDeletedAtIsNull(UUID branchId);

    @Query("SELECT d FROM Discount d WHERE d.branch.id = :branchId AND d.deletedAt IS NULL AND (d.startsAt IS NULL OR d.startsAt <= :now) AND (d.endsAt IS NULL OR d.endsAt > :now)")
    List<Discount> findActiveByBranchAt(@Param("branchId") UUID branchId, @Param("now") OffsetDateTime now);
}
