package com.ciet.demo_learn.domain.sale;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.*;
public interface SaleRepository extends JpaRepository<Sale, UUID> {
    List<Sale> findAllByBranchIdAndSoldAtBetween(UUID branchId, OffsetDateTime from, OffsetDateTime to);
    List<Sale> findAllByCashierIdAndSoldAtBetween(UUID cashierId, OffsetDateTime from, OffsetDateTime to);
}
