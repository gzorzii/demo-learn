package com.ciet.demo_learn.domain.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BranchShelfConfigRepository extends JpaRepository<BranchShelfConfig, UUID> {
    Optional<BranchShelfConfig> findByBranchId(UUID branchId);
}
