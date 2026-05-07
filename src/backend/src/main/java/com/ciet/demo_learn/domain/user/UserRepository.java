package com.ciet.demo_learn.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAndDeletedAtIsNull(String email);
    Optional<User> findByGoogleSubAndDeletedAtIsNull(String googleSub);
    List<User> findAllByBranchIdAndDeletedAtIsNull(UUID branchId);
}
