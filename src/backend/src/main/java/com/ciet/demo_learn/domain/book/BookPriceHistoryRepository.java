package com.ciet.demo_learn.domain.book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.*;
public interface BookPriceHistoryRepository extends JpaRepository<BookPriceHistory, UUID> {
    List<BookPriceHistory> findAllByBookIdOrderByChangedAtDesc(UUID bookId);

    @Query("SELECT h FROM BookPriceHistory h JOIN h.book b WHERE b.branch.id = :branchId AND (LOWER(b.title) LIKE LOWER(CONCAT('%', :term, '%')) OR LOWER(b.author) LIKE LOWER(CONCAT('%', :term, '%'))) AND h.changedAt BETWEEN :from AND :to ORDER BY h.changedAt DESC")
    List<BookPriceHistory> findByBranchAndTermAndPeriod(@Param("branchId") UUID branchId, @Param("term") String term, @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);
}
