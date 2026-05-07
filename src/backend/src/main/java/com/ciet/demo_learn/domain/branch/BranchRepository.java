package com.ciet.demo_learn.domain.branch;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    Optional<Branch> findByIdAndDeletedAtIsNull(UUID id);
    List<Branch> findAllByDeletedAtIsNull();
}
