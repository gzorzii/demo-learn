package com.ciet.demo_learn.domain.customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    List<Customer> findAllByBranchIdAndDeletedAtIsNull(UUID branchId);
    Optional<Customer> findByDocumentAndBranchId(String document, UUID branchId);
}
