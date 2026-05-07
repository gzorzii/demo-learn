package com.ciet.demo_learn.domain.label;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface LabelSizeRepository extends JpaRepository<LabelSize, UUID> {
    List<LabelSize> findAllByBranchIdOrBranchIdIsNullOrderByIsDefaultDesc(UUID branchId);
}
