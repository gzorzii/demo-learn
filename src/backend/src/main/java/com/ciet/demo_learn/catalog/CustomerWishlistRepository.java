package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.wishlist.CustomerWishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CustomerWishlistRepository extends JpaRepository<CustomerWishlist, UUID> {

    @Query("""
            SELECT w FROM CustomerWishlist w
            WHERE w.branch.id = :branchId
              AND (LOWER(w.title)  LIKE LOWER(CONCAT('%', :title,  '%'))
                OR LOWER(w.author) LIKE LOWER(CONCAT('%', :author, '%'))
                OR (w.isbn IS NOT NULL AND LOWER(w.isbn) = LOWER(:isbn)))
            """)
    List<CustomerWishlist> findMatchesForBook(
            @Param("branchId") UUID branchId,
            @Param("title")    String title,
            @Param("author")   String author,
            @Param("isbn")     String isbn);
}
