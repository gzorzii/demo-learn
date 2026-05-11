package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.user.User;
import com.ciet.demo_learn.user.UserRole;
import com.ciet.demo_learn.user.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    @Query("""
            SELECT ur.user FROM UserRole ur
            WHERE ur.user.branch.id = :branchId
              AND ur.role.name IN :roleNames
              AND ur.user.active = true
            """)
    List<User> findUsersByBranchAndRoles(
            @Param("branchId")   UUID branchId,
            @Param("roleNames")  List<String> roleNames);
}
