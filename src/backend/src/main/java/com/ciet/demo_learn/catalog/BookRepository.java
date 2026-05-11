package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.book.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID>, JpaSpecificationExecutor<Book> {

    Optional<Book> findByIdAndBranchId(UUID id, UUID branchId);

    @Query("SELECT b FROM Book b WHERE b.isbn = :isbn AND b.active = true ORDER BY b.registeredAt DESC LIMIT 1")
    Optional<Book> findTopByIsbnActive(@Param("isbn") String isbn);

    @Query(value = """
            SELECT b.id, b.title, b.author, b.category, b.condition, b.sale_price,
                   b.shelf_location, COALESCE(bs.quantity, 0) AS stock_quantity
            FROM book b
            LEFT JOIN book_stock bs ON bs.book_id = b.id AND bs.branch_id = :branchId
            WHERE b.branch_id = :branchId AND b.active = true
              AND (:condition IS NULL OR b.condition = :condition)
              AND (:category  IS NULL OR b.category  = :category)
              AND (:minPrice  IS NULL OR b.sale_price >= :minPrice)
              AND (:maxPrice  IS NULL OR b.sale_price <= :maxPrice)
            """,
            countQuery = """
            SELECT COUNT(b.id)
            FROM book b
            WHERE b.branch_id = :branchId AND b.active = true
              AND (:condition IS NULL OR b.condition = :condition)
              AND (:category  IS NULL OR b.category  = :category)
              AND (:minPrice  IS NULL OR b.sale_price >= :minPrice)
              AND (:maxPrice  IS NULL OR b.sale_price <= :maxPrice)
            """, nativeQuery = true)
    Page<BookSummaryProjection> listBooksRaw(
            @Param("branchId")  UUID branchId,
            @Param("condition") String condition,
            @Param("category")  String category,
            @Param("minPrice")  BigDecimal minPrice,
            @Param("maxPrice")  BigDecimal maxPrice,
            Pageable pageable);

    @Query(value = """
            SELECT b.id, b.title, b.author, b.category, b.condition, b.sale_price,
                   b.shelf_location, COALESCE(bs.quantity, 0) AS stock_quantity
            FROM book b
            LEFT JOIN book_stock bs ON bs.book_id = b.id AND bs.branch_id = :branchId
            WHERE b.branch_id = :branchId AND b.active = true
              AND (LOWER(b.title)  LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(b.author) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(b.isbn)   LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            countQuery = """
            SELECT COUNT(b.id)
            FROM book b
            WHERE b.branch_id = :branchId AND b.active = true
              AND (LOWER(b.title)  LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(b.author) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(b.isbn)   LIKE LOWER(CONCAT('%', :q, '%')))
            """, nativeQuery = true)
    Page<BookSummaryProjection> searchBooksRaw(
            @Param("branchId") UUID branchId,
            @Param("q")        String q,
            Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query(value = """
            UPDATE book SET title=:title, author=:author, isbn=:isbn,
            publisher=:publisher, year=:year, category=:category,
            condition_description=:conditionDescription, sale_price=:salePrice,
            description=:description, shelf_location=:shelfLocation,
            updated_at=now()
            WHERE id=:id
            """, nativeQuery = true)
    void updateBook(
            @Param("id")                   UUID id,
            @Param("title")                String title,
            @Param("author")               String author,
            @Param("isbn")                 String isbn,
            @Param("publisher")            String publisher,
            @Param("year")                 Integer year,
            @Param("category")             String category,
            @Param("conditionDescription") String conditionDescription,
            @Param("salePrice")            BigDecimal salePrice,
            @Param("description")          String description,
            @Param("shelfLocation")        String shelfLocation);
}
