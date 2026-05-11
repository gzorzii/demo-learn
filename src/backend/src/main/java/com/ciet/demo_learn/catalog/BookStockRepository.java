package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.book.BookStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BookStockRepository extends JpaRepository<BookStock, UUID> {

    Optional<BookStock> findByBookIdAndBranchId(UUID bookId, UUID branchId);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE book_stock SET quantity=:quantity, updated_at=now() WHERE book_id=:bookId", nativeQuery = true)
    void updateQuantity(@Param("bookId") UUID bookId, @Param("quantity") int quantity);
}
