package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.book.BookImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookImageRepository extends JpaRepository<BookImage, UUID> {

    List<BookImage> findByBookIdOrderByOrderAsc(UUID bookId);

    long countByBookId(UUID bookId);

    @Query("SELECT MAX(bi.order) FROM BookImage bi WHERE bi.book.id = :bookId")
    Optional<Integer> findMaxOrderByBookId(UUID bookId);

    Optional<BookImage> findByIdAndBookId(UUID id, UUID bookId);
}
