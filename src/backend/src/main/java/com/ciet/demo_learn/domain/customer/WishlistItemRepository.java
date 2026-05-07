package com.ciet.demo_learn.domain.customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface WishlistItemRepository extends JpaRepository<WishlistItem, UUID> {
    List<WishlistItem> findAllByCustomerIdAndFulfilledFalse(UUID customerId);

    @Query("SELECT w FROM WishlistItem w WHERE w.fulfilled = false AND w.customer.branch.id = :branchId AND (LOWER(w.bookTitle) = LOWER(:title) OR w.isbn = :isbn)")
    List<WishlistItem> findUnfulfilledByBranchAndBook(@Param("branchId") UUID branchId, @Param("title") String title, @Param("isbn") String isbn);
}
