package com.ciet.demo_learn.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ciet.demo_learn.model.User;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.userPermissions WHERE u.email = :email AND u.active = true")
    Optional<User> findByEmailWithPermissions(@Param("email") String email);
}
