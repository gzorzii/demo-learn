package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.purchase.UsedBookPurchase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UsedBookPurchaseRepository extends JpaRepository<UsedBookPurchase, UUID> {

    Optional<UsedBookPurchase> findByIdAndBranchId(UUID id, UUID branchId);
}
