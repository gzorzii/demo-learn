package com.ciet.demo_learn.domain.book;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface BookDiscountRepository extends JpaRepository<BookDiscount, UUID> {
    Optional<BookDiscount> findByBookId(UUID bookId);
}
