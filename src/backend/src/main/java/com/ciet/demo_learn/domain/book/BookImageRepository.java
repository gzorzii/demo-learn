package com.ciet.demo_learn.domain.book;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface BookImageRepository extends JpaRepository<BookImage, UUID> {}
