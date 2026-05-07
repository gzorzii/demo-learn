package com.ciet.demo_learn.domain.book;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {
    List<Book> findAllByBranchIdAndDeletedAtIsNull(UUID branchId);
    Optional<Book> findByIdAndBranchIdAndDeletedAtIsNull(UUID id, UUID branchId);
    List<Book> findAllByBranchIdAndIsbnAndDeletedAtIsNull(UUID branchId, String isbn);

    @Query("SELECT b FROM Book b WHERE b.branch.id = :branchId AND b.deletedAt IS NULL AND (LOWER(b.title) LIKE LOWER(CONCAT('%', :term, '%')) OR LOWER(b.author) LIKE LOWER(CONCAT('%', :term, '%')) OR b.isbn = :term)")
    List<Book> searchByTerm(@Param("branchId") UUID branchId, @Param("term") String term);
}
