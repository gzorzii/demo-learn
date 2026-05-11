package com.ciet.demo_learn.catalog;

import com.ciet.demo_learn.auth.AuthContext;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/books")
public class BookCatalogController {

    private final BookService bookService;
    private final AuthContext authContext;

    public BookCatalogController(BookService bookService, AuthContext authContext) {
        this.bookService = bookService;
        this.authContext = authContext;
    }

    @PreAuthorize("hasAnyAuthority('Administrador', 'Gerente', 'Catalogador')")
    @PostMapping
    public ResponseEntity<BookResponse> createBook(@Valid @RequestBody BookCreateRequest req) {
        UUID branchId = authContext.getBranchId();
        UUID userId = authContext.getUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookService.createBook(req, branchId, userId));
    }

    @GetMapping
    public ResponseEntity<BookPageResponse> listBooks(
            @RequestParam(required = false) String condition,
            @RequestParam(required = false) String category,
            @RequestParam(name = "min_price", required = false) BigDecimal minPrice,
            @RequestParam(name = "max_price", required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "registered_at") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(name = "branch_id", required = false) UUID branchIdParam) {
        UUID branchId = authContext.resolveBranchId(branchIdParam);
        return ResponseEntity.ok(bookService.listBooks(branchId, condition, category, minPrice, maxPrice, sort, direction, page, size));
    }

    @GetMapping("/search")
    public ResponseEntity<BookPageResponse> searchBooks(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(name = "branch_id", required = false) UUID branchIdParam) {
        UUID branchId = authContext.resolveBranchId(branchIdParam);
        return ResponseEntity.ok(bookService.searchBooks(branchId, q, page, size));
    }

    @PreAuthorize("hasAnyAuthority('Administrador', 'Gerente', 'Catalogador')")
    @GetMapping("/isbn-prefill")
    public ResponseEntity<IsbnPrefillResponse> isbnPrefill(@RequestParam String isbn) {
        return ResponseEntity.ok(bookService.getIsbnPrefill(isbn));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBook(
            @PathVariable UUID id,
            @RequestParam(name = "branch_id", required = false) UUID branchIdParam) {
        UUID branchId = authContext.resolveBranchId(branchIdParam);
        return ResponseEntity.ok(bookService.getBook(id, branchId));
    }

    @PreAuthorize("hasAnyAuthority('Administrador', 'Gerente', 'Catalogador')")
    @PutMapping("/{id}")
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable UUID id,
            @Valid @RequestBody BookUpdateRequest req) {
        UUID branchId = authContext.getBranchId();
        UUID userId = authContext.getUserId();
        return ResponseEntity.ok(bookService.updateBook(id, req, branchId, userId));
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<ImageUploadResponse> uploadImage(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        UUID branchId = authContext.getBranchId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookService.uploadImage(id, file, branchId));
    }

    @PatchMapping("/{id}/images/reorder")
    public ResponseEntity<List<ImageResponse>> reorderImages(
            @PathVariable UUID id,
            @Valid @RequestBody ImageReorderRequest req) {
        UUID branchId = authContext.getBranchId();
        return ResponseEntity.ok(bookService.reorderImages(id, req, branchId));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<Void> deleteImage(
            @PathVariable UUID id,
            @PathVariable UUID imageId) {
        UUID branchId = authContext.getBranchId();
        bookService.deleteImage(id, imageId, branchId);
        return ResponseEntity.noContent().build();
    }
}
