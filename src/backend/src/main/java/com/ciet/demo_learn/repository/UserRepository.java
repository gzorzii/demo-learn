package com.ciet.demo_learn.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ciet.demo_learn.model.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.userPermissions WHERE u.email = :email AND u.active = true")
    Optional<User> findByEmailWithPermissions(@Param("email") String email);

    List<User> findByPdmIdAndActiveTrueAndDeletedAtIsNull(UUID pdmId);

    boolean existsByIdAndPdmIdAndActiveTrueAndDeletedAtIsNull(UUID userId, UUID pdmId);

    @Query("SELECT u.pdm.id FROM User u WHERE u.id = :userId AND u.active = true AND u.deletedAt IS NULL")
    Optional<UUID> findPdmIdByUserId(@Param("userId") UUID userId);

    @Query("""
            SELECT u FROM User u
            WHERE u.active = true AND u.deletedAt IS NULL
              AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%')))
            ORDER BY u.name ASC
            LIMIT 20
            """)
    List<User> searchByNameOrEmail(@Param("term") String term);

    @Query("SELECT u FROM User u WHERE u.pdm.id = :pdmId AND u.active = true AND u.deletedAt IS NULL AND u.id NOT IN :excludedIds")
    List<User> findActiveByPdmIdExcluding(@Param("pdmId") UUID pdmId, @Param("excludedIds") List<UUID> excludedIds);
}
